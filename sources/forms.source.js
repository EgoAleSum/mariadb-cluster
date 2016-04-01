'use strict'

var azureVMSizes = require('./azure-vm-sizes.json')

var formMode = false

var setFormMode = function(newMode) {
    // Reset visual state, then set the proper one
    $('[gen-role="mode"]').removeClass('active')
        .filter('[gen-mode="'+newMode+'"]').addClass('active')
    $('[gen-role="conditional-param"]').hide()
        .filter('[gen-mode="'+newMode+'"]').show()
    $('[gen-role="conditional-param"] input').prop('disabled', true)
        .filter('[gen-mode="'+newMode+'"] input').prop('disabled', false)
    $('[gen-role="conditional-param"] select').prop('disabled', true)
        .filter('[gen-mode="'+newMode+'"] select').prop('disabled', false)
    $('[gen-role="conditional-param"] textarea').prop('disabled', true)
        .filter('[gen-mode="'+newMode+'"] textarea').prop('disabled', false)
    
    // Set value
    formMode = newMode
}

var prepareFormMode = function() {
    // Add callbacks
    $('[gen-role="mode"]').on('click', function(event) {
        event.preventDefault()
        
        setFormMode($(this).attr('gen-mode'))
    })
}

var nodeSize = function() {
    // Populate all nodes in the select
    var $nodeSizeSelect = $('#node-size')
    for(var k in azureVMSizes) {
        if(azureVMSizes.hasOwnProperty(k)) {
            $nodeSizeSelect.append('<option value="'+k+'">'+k+'</option>')
        }
    }
}

var formSubmit = function(done) {
    var $form = $('#generator-form')
    $form.submit(function(event) {
        // Prevent submission
        event.preventDefault()
        
        // Remove error messages from all groups
        $('.form-group').removeClass('has-error')
        
        // Collect all values and make sure they're correct
        var formValues = {
            mode: formMode
        }
        
        // For mode ARM
        if(formMode == 'arm') {
            // Number of nodes
            var $nodeCount = $('#node-count', $form)
            formValues.nodeCount = parseInt($nodeCount.val())
            if(!(~[3,5].indexOf(formValues.nodeCount))) {
                $nodeCount.parents('.form-group').addClass('has-error')
                return false
            }
            
            // Node size
            var $nodeSize = $('#node-size', $form)
            formValues.nodeSize = $nodeSize.val() + ''
            if(!(~Object.keys(azureVMSizes).indexOf(formValues.nodeSize))) {
                $nodeSize.parents('.form-group').addClass('has-error')
                return false
            }
            
            // Storage account name prefix
            var $storageAccountPrefix = $('#storage-account-prefix', $form)
            formValues.storageAccountPrefix = ($storageAccountPrefix.val() + '').trim()
            if(!formValues.storageAccountPrefix.match(/^[0-9a-z]{1,8}$/)) {
                $storageAccountPrefix.parents('.form-group').addClass('has-error')
                return false
            }
            
            // SSH key
            var $sshKey = $('#ssh-key', $form)
            formValues.sshKey = ($sshKey.val() + '').trim()
            if(!formValues.sshKey.match(/^ssh-(rsa|dss) AAAA[0-9A-Za-z+/]+[=]{0,3}/)) {
                $sshKey.parents('.form-group').addClass('has-error')
                return false
            }
            
            // Admin username
            var $adminUsername = $('#admin-username', $form)
            formValues.adminUsername = ($adminUsername.val() + '').trim()
            if(!formValues.adminUsername.match(/^[a-z_][a-z0-9_-]*$/)) {
                $adminUsername.parents('.form-group').addClass('has-error')
                return false
            }
        }
        else if(formMode == 'cloudconfig') {
            // vCPU count
            var $vcpuCount = $('#vcpu-count', $form)
            formValues.vcpuCount = parseInt($vcpuCount.val())
            if(formValues.vcpuCount < 0 || formValues.vcpuCount > 32) {
                $vcpuCount.parents('.form-group').addClass('has-error')
                return false
            }
            
            // etcd2 node count
            var $etcdNodeCount = $('#etcd-node-count', $form)
            formValues.etcdNodeCount = parseInt($etcdNodeCount.val())
            if(formValues.etcdNodeCount < 1) {
                $etcdNodeCount.parents('.form-group').addClass('has-error')
                return false
            }
        }
        
        // etcd discovery URL
        var $discoveryUrl = $('#etcd-discovery-url', $form)
        formValues.discoveryUrl = ($discoveryUrl.val() + '').trim()
        if(!formValues.discoveryUrl) {
            // Empty = auto-generate
            formValues.discoveryUrl = false
        }
        else if(!formValues.discoveryUrl.match(/^https\:\/\/discovery\.etcd\.io\/[a-f0-9]{32}$/)) {
            $discoveryUrl.parents('.form-group').addClass('has-error')
            return false
        }
        
        // Invoke callback
        if(done) {
            done(formValues)
        }
        
        // Prevent submission
        return false
    })
}

module.exports = {
    prepareFormMode: prepareFormMode,
    setFormMode: setFormMode,
    nodeSize: nodeSize,
    formSubmit: formSubmit
}
