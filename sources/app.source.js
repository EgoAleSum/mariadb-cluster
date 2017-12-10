// Main application

'use strict'

var forms = require('./forms.source.js')
var cloudConfig = require('./cloud-config.source.js')
var arm = require('./arm.source.js')

var _clipboard = null

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

    // Populate all node sizes in the select and bind action to change event to populate data disk select
    forms.nodeSize()

    // Callback to show output
    var showOutput = function(armTemplate, yamlString, yamlB64) {
        // Restore clipboard.js
        if(_clipboard) {
            _clipboard.destroy()
        }

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

        // Clipboard
        _clipboard = new Clipboard('.clipboard-btn')
    }

    // Bind to form submit action
    forms.formSubmit(function(formValues) {
        // Generate the cloud-config.yaml file
        cloudConfig(formValues, function(yamlString, yamlB64) {
            // Generate the Azure Resource Manager template if needed
            var armTemplate = false
            if(formValues.mode == 'arm') {
                armTemplate = arm(formValues, yamlB64)
            }

            // Show output
            showOutput(armTemplate, yamlString, yamlB64)
        })
    }, function() {
        // Disable button on click
        $('[gen-role="generate-button"]').prop('disabled', true).text('Generating… Please wait')
    })
})
