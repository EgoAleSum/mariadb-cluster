'use strict'

var pack = require('./cloud-config.pack.json')

// Source for the cloud-config.yaml file
var yamlSource = {
    // JSON structure for the cloud-config.yaml file
    tree: {
        "write_files": [],
        "coreos": {
            "update": {
                "reboot-strategy": "etcd-lock"
            },
            "etcd2": {
                "discovery": false,
                "advertise-client-urls": "http://$private_ipv4:2379,http://$private_ipv4:4001",
                "initial-advertise-peer-urls": "http://$private_ipv4:2380",
                "listen-client-urls": "http://0.0.0.0:2379,http://0.0.0.0:4001",
                "listen-peer-urls": "http://$private_ipv4:2380"
            },
            "units": []
        }
    },

    // List of files for write_files
    readFiles: {
        'docker-mariadb-galera.sh': {
            'path': '/opt/bin/docker-mariadb-galera.sh',
            'owner': 'root',
            'permissions': '0755'
        },
        'docker-mariadb-waiter.sh': {
            'path': '/opt/bin/docker-mariadb-waiter.sh',
            'owner': 'root',
            'permissions': '0755'
        },
        'etcd-waiter.sh': {
            'path': '/opt/bin/etcd-waiter.sh',
            'owner': 'root',
            'permissions': '0755'
        },
        'mysql_server.cnf': {
            'path': '/opt/mysql.conf.d/mysql_server.cnf',
            'owner': 'root',
            'permissions': '0644'
        }
    },

    // List of systemd units
    units: [
        { 'name': 'docker.service', 'command': 'start' },
        { 'name': 'etcd2.service', 'command': 'start' },
        { 'name': 'docker-mariadb-galera.service', 'command': 'start', 'source': 'docker-mariadb-galera.service' },
        { 'name': 'docker-mariadb-waiter.service', 'command': 'start', 'source': 'docker-mariadb-waiter.service' },
        { 'name': 'etcd-waiter.service', 'command': 'start', 'source': 'etcd-waiter.service' },
    ]
}

// Entry-point for the unit. Generate the cloud-config.yaml file
var cloudConfig = function(formValues, done) {
    // Check if the etcd2 discovery URL has been passed
    if(!formValues.discoveryUrl) {
        // Need to request discovery url from https://discovery.etcd.io/new?size=X
        // Use crossorigin.me to circument the Same-Origin Policy
        var nodes = formValues.nodeCount || formValues.etcdNodeCount
        $.get('https://crossorigin.me/' + 'https://discovery.etcd.io/new?size='+nodes, function(result) {
            // result should contain the etcd discovery url
            if(!result || !result.match(/^https\:\/\/discovery\.etcd\.io\/[a-f0-9]{32}$/)) {
                alert('Invalid response from discovery.etcd.io')
            }
            else {
                // Build YAML file
                formValues.discoveryUrl = result
                buildYaml(formValues, done)
            }
        })
    }
    else {
        // Go straight to building the YAML file
        buildYaml(formValues, done)
    } 
}

// Build the cloud-config.yaml file
var buildYaml = function(formValues, done) {    
    // Create the tree
    var yamlTree = Object.assign({}, yamlSource.tree)
    
    // etcd2 discovery url
    yamlTree.coreos.etcd2.discovery = formValues.discoveryUrl
    
    // Read files to be created and append the data to the yaml tree
    for(var k in yamlSource.readFiles) {
        if(yamlSource.readFiles.hasOwnProperty(k)) {
            var push = Object.assign({}, yamlSource.readFiles[k]) // Clone the object
            push.content = pack[k]
            yamlTree.write_files.push(push)
        }
    }
    
    // systemd units
    for(var i = 0, len = yamlSource.units.length; i < len; i++) {
        var unit = yamlSource.units[i]
        
        var push = Object.assign({}, unit) // Clone the object
        delete push.source
        delete push['drop-ins-source']
        
        if(unit['drop-ins-source']) {
            push['drop-ins'] = []
            for(var k in unit['drop-ins-source']) {
                if(unit['drop-ins-source'].hasOwnProperty(k)) {
                    push['drop-ins'].push({
                        name: k,
                        content: pack[k]
                    })
                }
            }
        }
        if(unit.source) {
            push.content = pack[unit.source]
        }
        
        yamlTree.coreos.units.push(push)
    }
    
    // Generate YAML document
    var yamlString = "#cloud-config\n\n" + jsyaml.safeDump(yamlTree, {lineWidth: -1})
    
    // Convert to base64 (note: this does NOT support UTF-8)
    var yamlB64 = btoa(yamlString)
    
    done(yamlString, yamlB64)
}

module.exports = cloudConfig
