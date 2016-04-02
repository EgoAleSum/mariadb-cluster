'use strict'

var template = require('../azuredeploy.json')

// Generate Azure Resource Manager template
module.exports = function(formValues, yamlB64) {
    var result = Object.assign({}, template)
    
    // Node size
    result.parameters.vmSize.defaultValue = formValues.nodeSize
    
    // Node count
    result.parameters.numberOfNodes.defaultValue = formValues.nodeCount
    
    // Storage account name prefix
    result.parameters.storageAccountNamePrefix.defaultValue = formValues.storageAccountPrefix
    
    // Admin username
    result.parameters.adminUserName.defaultValue = formValues.adminUsername
    
    // SSH key
    result.parameters.sshKeyData.defaultValue = formValues.sshKey
    
    // cloud-config.yaml (base64)
    result.parameters.cloudConfig.defaultValue = yamlB64
    
    // Return JSON string
    return JSON.stringify(result, false, 2)
}
