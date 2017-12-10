'use strict'

let co = require('co')
let fs = require('mz/fs')

module.exports = function(grunt) {
    grunt.initConfig({
        pack: {
            dist: {
                src: ['sources/cloud-config/*'],
                dest: 'sources/cloud-config.pack.json'
            }
        },
        browserify: {
            dist: {
                files: {
                    'sources/app.build.js': ['sources/app.source.js']
                },
                options: {
                }
            }
        },
        htmlbuild: {
            dist: {
                src: 'sources/generator.source.html',
                dest: 'generator.html',
                options: {
                    scripts: {
                        app: 'sources/app.build.js',
                        yaml: 'node_modules/js-yaml/dist/js-yaml.min.js'
                    }
                }
            }
        },
        watch: {
            scripts: {
                files: ['sources/*.source.*', 'sources/cloud-config/*', 'sources/templates/*'],
                tasks: ['default']
            }
        }
    })
    
    grunt.loadNpmTasks('grunt-browserify')
    grunt.loadNpmTasks('grunt-html-build')
    grunt.loadNpmTasks('grunt-contrib-watch')
    
    grunt.registerMultiTask('pack', function() {
        let task = this
        let taskDone = task.async()
		let files = this.files
		let options = this.options()
		
        co(function*() {
            let readPromisesList = {}
            for(let i = 0; i < files.length; i++) {
                let f = files[i]
                
                if(f.src.length) {
                    let dest = f.dest
                    let done = 0
                    
                    for(let j = 0; j < f.src.length; j++) {
                        let filename = f.src[j].split('/').pop()
                        let promise = Promise.resolve(true).then(res => {
                            return fs.readFile(f.src[j], 'utf8')
                        })
                        readPromisesList[filename] = promise
                    }
                    
                    let pack = yield readPromisesList
                    
                    let packStr = JSON.stringify(pack)
                    yield fs.writeFile(dest, packStr)
                }
            }
            
            taskDone()
        })
    })
    
    grunt.registerTask('default', ['pack', 'browserify', 'htmlbuild'])
}
