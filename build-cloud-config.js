'use strict'

// Load modules
let fs = require('mz/fs')
let zlib = require('mz/zlib')
let yaml = require('js-yaml')
let request = require('request-promise')
let co = require('co')

co(function* () { try {
    // Parse console parameters and lowercase all keys
    let argv = require('minimist')(process.argv.slice(2))
    
    // Has user requested the help page?
    if(argv.h || argv.help) {
        let options = {
            '--cluster_size': 'Size of the etcd cluster. Optional but strongly recommended if discovery_url is empty. Default: 3',
            '--discovery_url': 'Discovery url for etcd; will be generated automatically if empty',
            '-h, --help': 'Display this message'
        }
        console.log('Generate a cloud-config.yaml file for the template.\nSupported options:')
        for(let k in options) {
            if(options.hasOwnProperty(k)) {
                console.log('\t', k, '\t', options[k])
            }
        }
        
        process.exit(0)
    }
    
    // Check if a discovery url for etcd has been passed; otherwise, request one
    let etcdDiscoveryUrl = false
    if(argv.discovery_url) {
        etcdDiscoveryUrl = argv.discovery_url
    }
    else {
        let clusterSize = argv.cluster_size ? parseInt(argv.cluster_size) : 3
        if(clusterSize < 2 || clusterSize > 9) {
            throw new Error('Invalid cluster size: has to be between 2 and 9')
        }
        etcdDiscoveryUrl = yield request('https://discovery.etcd.io/new?size=' + clusterSize)
        
        console.info('Auto-generated etcd discovery url: ' + etcdDiscoveryUrl)
    }
    
    // JSON structure for the cloud-config.yaml file
    let yamlTree = {
        "write_files": [],
        "coreos": {
            "update": {
                "reboot-strategy": "etcd-lock"
            },
            "etcd2": {
                "discovery": etcdDiscoveryUrl,
                "advertise-client-urls": "http://$private_ipv4:2379,http://$private_ipv4:4001",
                "initial-advertise-peer-urls": "http://$private_ipv4:2380",
                "listen-client-urls": "http://0.0.0.0:2379,http://0.0.0.0:4001",
                "listen-peer-urls": "http://$private_ipv4:2380"
            },
            "units": []
        }
    }
    
    // List of files for write_files
    let readFiles = {
        'docker-mariadb-galera.sh': {
            'dest': '/opt/bin/docker-mariadb-galera.sh',
            'owner': 'root',
            'permissions': '0755'
        },
        'docker-mariadb-waiter.sh': {
            'dest': '/opt/bin/docker-mariadb-waiter.sh',
            'owner': 'root',
            'permissions': '0755'
        },
        'docker-overlay-network.sh': {
            'dest': '/opt/bin/docker-overlay-network.sh',
            'owner': 'root',
            'permissions': '0755'
        },
        'etcd-waiter.sh': {
            'dest': '/opt/bin/etcd-waiter.sh',
            'owner': 'root',
            'permissions': '0755'
        },
        'mysql_server.cnf': {
            'dest': '/opt/mysql.conf.d/mysql_server.cnf',
            'owner': 'root',
            'permissions': '0644'
        }
    }
    
    // List of systemd units
    let units = [
        { 'name': 'docker.service', 'command': 'start', 'drop-ins-source': {'10-opts.conf': 'dropin-docker.conf'} },
        { 'name': 'etcd2.service', 'command': 'start' },
        { 'name': 'docker-mariadb-galera.service', 'command': 'start', 'source': 'docker-mariadb-galera.service' },
        { 'name': 'docker-mariadb-waiter.service', 'command': 'start', 'source': 'docker-mariadb-waiter.service' },
        { 'name': 'docker-overlay-network.service', 'command': 'start', 'source': 'docker-overlay-network.service' },
        { 'name': 'etcd-waiter.service', 'command': 'start', 'source': 'etcd-waiter.service' },
    ]
    
    // Read files to be created, then gzip and base64-encode them and lastly append the data to the yaml tree
    let readFilesPromises = {}
    for(let k in readFiles) {
        if(readFiles.hasOwnProperty(k)) {
            readFilesPromises[k] = Promise.resolve(true)
                .then(function() {
                    return fs.readFile('sources/'+k, 'utf8')  
                })
                .then(function(read) {
                    // Add to the tree
                    let push = Object.assign({}, readFiles[k]) // Clone the object
                    push.content = read
                    delete push.source
                    yamlTree['write_files'].push(push)
                    
                    return true
                })
                // Do not do gzip, so the cloud-config file is still readable
                /*.then(function(read) {
                    return zlib.gzip(read)  
                })
                .then(function(compressed) {
                    let encoded = compressed.toString('base64')
                    
                    // Add to the tree
                    let push = Object.assign({}, readFiles[k]) // Clone the object
                    push.content = encoded
                    push.encoding = 'gz+base64'
                    yamlTree['write_files'].push(push)
                    
                    return true
                })*/
        }
    }
    
    // Read systemd units
    let unitsPromises = []
    for(let i = 0, len = units.length; i < len; i++) {
        let unit = units[i]
        
        let push = Object.assign({}, unit) // Clone the object
        delete push.source
        delete push['drop-ins-source']
        yamlTree.coreos.units.push(push)
        
        if(unit['drop-ins-source']) {
            push['drop-ins'] = []
            for(let k in unit['drop-ins-source']) {
                if(unit['drop-ins-source'].hasOwnProperty(k)) {
                    let promise = Promise.resolve(true)
                        .then(function() {
                            return fs.readFile('sources/'+unit['drop-ins-source'][k], 'utf8')
                        })
                        .then(function(read) {
                            push['drop-ins'].push({
                                name: k,
                                content: read
                            })
                            
                            return true
                        })
                    
                    unitsPromises.push(promise)
                }
            }
        }
        if(unit.source) {
            let promise = Promise.resolve()
                .then(function() {
                    return fs.readFile('sources/'+unit.source, 'utf8')
                })
                .then(function(read) {
                    push.content = read
                    
                    return true
                })
            
            unitsPromises.push(promise)
        }
    }
    
    // Execute all promises
    yield [readFilesPromises, unitsPromises]
    
    // Generate the yaml file and write it to disk
    let yamlString = "#cloud-config\n\n" + yaml.safeDump(yamlTree, {lineWidth: -1})
    yield fs.writeFile('cloud-config.yaml', yamlString, 'utf8')
    
    console.log('cloud-config.yaml generated')
} catch (err) { return Promise.reject(err) }})
.catch(function(err) {
    console.error(err.stack)
})
