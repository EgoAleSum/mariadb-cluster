'use strict'

var pack = require('./cloud-config.pack.json')
var yamlSource = require('./yaml.source.js')
var yamlARMSource = require('./yaml-arm.source.js')
var azureVMSizes = require('./azure-vm-sizes.json')

// URL for the CORS proxy service, to circument the Same-Origin Policy
// By default we're using the public service by CrossOrigin.me
// You can grab the source code for the app at https://github.com/technoboy10/crossorigin.me and run your own instance of the CORS proxy, then change the URL below
var corsProxyUrl = 'https://crossorigin.me/'

// Entry-point for the unit. Generate the cloud-config.yaml file
var cloudConfig = function(formValues, done) {
    // Check if the etcd2 discovery URL has been passed
    if(!formValues.discoveryUrl) {
        // Need to request discovery url from https://discovery.etcd.io/new?size=X
        var nodes = formValues.nodeCount || formValues.etcdNodeCount
        $.get(corsProxyUrl + 'https://discovery.etcd.io/new?size='+nodes+'&_='+Date.now(), function(result) {
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
    // Select the proper template
    var template = (formValues.mode == 'arm') ? yamlARMSource : yamlSource
    
    // Create the tree
    var yamlTree = JSON.parse(JSON.stringify(template.tree)) // Deep clone the object
    
    // etcd2 discovery url
    yamlTree.coreos.etcd2.discovery = formValues.discoveryUrl
    
    // Number of cores
    var vcpus = 0
    if(formValues.nodeSize) {
        var nodeSize = azureVMSizes[formValues.nodeSize]
        if(nodeSize && nodeSize.cores) {
            vcpus = nodeSize.cores
        }
    }
    else if(formValues.vcpuCount) {
        vcpus = formValues.vcpuCount
    }
    
    // Read files to be created and append the data to the yaml tree
    for(var k in template.readFiles) {
        if(template.readFiles.hasOwnProperty(k)) {
            var push = JSON.parse(JSON.stringify(template.readFiles[k])) // Deep clone the object
            push.content = pack[k]
            
            if(k == 'mysql_server.cnf') {
                push.content = push.content.replace('{WSREP_SLAVE_THREADS}', (2 * vcpus) || 1)
            }
            
            yamlTree.write_files.push(push)
        }
    }
    
    // systemd units
    for(var i = 0, len = template.units.length; i < len; i++) {
        var unit = template.units[i]
        
        var push = JSON.parse(JSON.stringify(unit)) // Deep clone the object
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
