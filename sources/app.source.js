// Main application

'use strict'

var forms = require('./forms.source.js')
var cloudConfig = require('./cloud-config.source.js')

$(document).ready(function() {
    // Form mode: prepare, and set default to Azure Resource Manager template
    forms.prepareFormMode()
    forms.setFormMode('arm')
    
    // Populate all node sizes in the select
    forms.nodeSize()
    
    // Bind to form submit action
    forms.formSubmit(function(formValues) {
        // Generate the cloud-config.yaml file
        cloudConfig(formValues)
    })
})
