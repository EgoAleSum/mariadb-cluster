'use strict'

var template = require('./templates/base.template.json')
var dataDiskTemplate = require('./templates/unmanaged-disk.template.json')
var storageAccountTemplate = require('./templates/storage-account.template.json')

// Generate Azure Resource Manager template
module.exports = function(formValues, yamlB64) {
    var result = JSON.parse(JSON.stringify(template))
    
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
    
    // Data disks: create a storage account per each node, since each account can hold 40 VHDs
    result.resources.push(JSON.parse(JSON.stringify(storageAccountTemplate)))
    
    // Add the disks to the VM resource
    for(var i = 0; i < result.resources.length; i++) {
        var res = result.resources[i]
        if(res && res.type && res.type == 'Microsoft.Compute/virtualMachines') {
            // Dependency on the storage accounts
            if(!res.dependsOn) {
                res.dependsOn = []
            }
            res.dependsOn.push("[concat('Microsoft.Storage/storageAccounts/', toLower( concat( parameters('storageAccountNamePrefix'), 'vhd', copyindex(), uniqueString(resourceGroup().id) ) ) )]")
            
            // Attach data disks
            //console.log(res.properties.storageProfile)
            if(!res.properties.storageProfile.dataDisks) {
                res.properties.storageProfile.dataDisks = []
            }
            var dataDisks = res.properties.storageProfile.dataDisks
            for(var lun = 0; lun < formValues.dataDisks; lun++) {
                var attach = JSON.parse(JSON.stringify(dataDiskTemplate))
                attach.name = attach.name.replace('*', lun)
                attach.lun = lun
                attach.vhd.uri = attach.vhd.uri.replace('*', lun)
                dataDisks.push(attach)
            }
            
            break
        }
    }
    
    // Return JSON string
    return JSON.stringify(result, false, 2)
}
