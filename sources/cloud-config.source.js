'use strict'

var pack = require('./cloud-config.pack.json')
var yamlSource = require('./yaml.source.js')
var azureVMSizes = require('./azure-vm-sizes.json')

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
    for(var k in yamlSource.readFiles) {
        if(yamlSource.readFiles.hasOwnProperty(k)) {
            var push = Object.assign({}, yamlSource.readFiles[k]) // Clone the object
            push.content = pack[k]
            
            if(k == 'mysql_server.cnf') {
                push.content = push.content.replace('{WSREP_SLAVE_THREADS}', (2 * vcpus) || 1)
            }
            
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
