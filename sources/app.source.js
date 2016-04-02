// Main application

'use strict'

var forms = require('./forms.source.js')
var cloudConfig = require('./cloud-config.source.js')

$(document).ready(function() {
    // Hide the output panel
    $('[gen-role="page"][gen-page="output"]').hide()
    
    // Restart button action
    $('[gen-role="restart-button"]').on('click', function() {
        $('[gen-role="page"]').show()
            .filter('[gen-page="output"]').hide()
    })
    
    // Form mode: prepare, and set default to Azure Resource Manager template
    forms.prepareFormMode()
    forms.setFormMode('arm')
    
    // Populate all node sizes in the select
    forms.nodeSize()
    
    // Callback to show output
    var showOutput = function(armTemplate, yamlString, yamlB64) {
        // Restore button
        $('[gen-role="generate-button"]').prop('disabled', false).text('Generate')
        
        // Show the output panel
        $('[gen-role="page"]').hide()
            .filter('[gen-page="output"]').show()
        
        // Azure Resource Manager template
        if(armTemplate) {
            $('[gen-role="output"][gen-content="arm"]').show()
            $('[gen-role="output"][gen-content="arm"] code').text(armTemplate)
        }
        else {
            $('[gen-role="output"][gen-content="arm"]').hide()
        }
        
        // cloud-config.yaml
        $('[gen-role="output"][gen-content="yaml"] code').text(yamlString)
        $('[gen-role="output"][gen-content="yamlb64"] code').text(yamlB64)
        
        // Highlight syntax
        $('pre code').each(function(i, block) {
            hljs.highlightBlock(block)
        })
    }
    
    // Bind to form submit action
    forms.formSubmit(function(formValues) {
        // Generate the cloud-config.yaml file
        cloudConfig(formValues, function(yamlString, yamlB64) {
            // Generate the Azure Resource Manager template if needed
            if(formValues.mode == 'arm') {
                
            }
            else {
                showOutput(false, yamlString, yamlB64)
            }
        })
    }, function() {
        // Disable button on click
        $('[gen-role="generate-button"]').prop('disabled', true).text('Generating… Please wait')
    })
})
