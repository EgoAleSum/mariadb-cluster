'use strict'

var pack = require('./cloud-config.pack.json')

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
    console.log(formValues)
}

module.exports = cloudConfig
