# MariaDB + Galera Cluster on CoreOS with Docker

This repository contains a generator app for the Cloud Config and the Azure Resource Manager (ARM) template files, to create a MariaDB database with Galera Cluster, running inside Docker containers on CoreOS. You can read more about the architecture, and the choices behind it, on [this blog post](http://withblue.ink/2016/03/09/galera-cluster-mariadb-coreos-and-docker-part-1.html). The ARM template is a JSON file that can be deployed automatically with just a few clicks on Azure and it includes a tailored Cloud Config file.

The starting point is the generator app, which is a static HTML file that runs inside any modern web browser to create ad-hoc Cloud Config and Azure ARM template files. In order to use the generator, clone this repository, then open the file `generator.html` with a web browser.

**Please ignore the pre-made `azuredeploy.json` file in this repository, and always generate a new one using the generator app.** The reason why this repository includes `azuredeploy.json` and `azuredeploy.parameters.json` is just for testing with CI.


## Getting started

**Clone this repository in your local machine, then open the `generator.html` file with a web browser.** Using one of the "evergreen browsers" (Edge, Chrome, Safari, Firefox) is recommended. You will need to be connected to the Internet for the web application to work properly.

The web application offers two modes:
- *Azure Resource Manager*: in this mode, an ARM template (a JSON document) is generated, ready to be deployed to Azure. The resulting ARM template includes the Cloud Config file too.
- *Only cloud-config.yaml*: generates only the Cloud Config file, in plaintext and base64-encoded. This file can be used to startup the Galera Cluster on any public/private cloud.

### Deploying to Azure

The ARM template allows you to deploy a MariaDB + Galera Cluster (based on CoreOS) with a few clicks, running on the Microsoft Azure cloud.

1. Ensure you have an active Azure subscription. You can also get a [free trial](http://azure.com/free).
2. Using the `generator.html` page in your machine, create the Azure Resource Manager template, properly configured.
3. Open the [Azure Portal](https://portal.azure.com), then press "+ New" on the top left corner, search for "Template deployment" and select the result with the same name. Then click on the "Create" button.
4. In the "Template" blade, paste the "Azure Resource Manager template" JSON document generated with the HTML app.
5. In the "Parameters" blade, leave all values to their default (the JSON you pasted has all your parameters already hardcoded as default values).
6. Select the subscription you want to deploy the cluster into, then create a new Resource Group (or choose an existing one) and pick in what Azure region you want the deployment to happen. Lastly, accept the mandatory legal terms and press Create.
7. Azure will deploy your VMs and linked resources, and then MariaDB and Galera Cluster will be started in all the VMs automatically. The entire process should last **approximately 5 minutes**.

### etcd2 Discovery URL

An optional parameter in the generator app is the Discovery URL for etcd2. etcd2 is a distributed key/value storage that is shipped with CoreOS and on which the deployment scripts in this repository rely on.

**Most users should leave the Discovery URL field empty**. When the field is not set, the generator app will request a new Discovery URL automatically on your behalf, using `http://discovery.etcd.io/`. You will need to manually set a value for this field if you are re-deploying the template in an existing, running cluster.

### SSH key

The generator app requires you to specify a **SSH RSA public key**.

**Linux and Mac** users can use the built-in `ssh-keygen` command line utility, which is pre-installed in OSX and most Linux distributions. Execute the following command, and when prompted save to the default location (`~/.ssh/id_rsa`):

    $ ssh-keygen -t rsa -b 4096

Your **public** key will be located in `~/.ssh/id_rsa.pub`.

**Windows** users can generate compatible keys using PuTTYgen, as shown in [this article](https://winscp.net/eng/docs/ui_puttygen). Please make sure you select "SSH-2 RSA" as type, and use 4096 bits as size for best security.


## For developers

If you want to modify the generator app (for example because you want to alter the deployment scripts, systemd units, etc), you can re-compile it using Grunt.

1. Ensure Node.js 5.0 or higher is installed (it will probably work with Node.js 4.x too, but it's not tested). You can download the latest version from the [Node.js website](https://nodejs.org/).
2. Clone this git repository on your machine: `$ git clone https://github.com/EgoAleSum/mariadb-cluster.git`
3. Inside the directory where you cloned the repository, install the required npm modules: `$ npm install`
4. Rebuild the generator app with: `$ grunt`.
5. To watch for changes to source files and re-compile automatically, you can use `$ grunt watch`.

Structure of the repository:
- The `generator.html` app is built from files in the `sources` folder.
- Inside the source folder, the `cloud-config` directory contains the raw deployment scripts, systemd units and configuration files to be copied on the VMs. Those files are then merged in a single JSON document by Grunt at "compile time". 
- The entry-point for the JavaScript code is the `app.source.js` file. Using Browserify, Grunt merges all JavaScript code into `app.build.js`.
- Lastly, Grunt inlines all JavaScript code inside the `generator.html` file using html-build. Please note that certain third-party dependencies, such as jQuery, Bootstrap and highlight.js, are linked externally (over the Internet).
- Because the `discovery.etcd.io` service doesn't support CORS (see [this issue on GitHub](https://github.com/coreos/discovery.etcd.io/issues/12)), in order for the automatic generation of Discovery URLs to work we need to proxy the request. Without a backend server for the generator app, the best solution is to use a third-party service like [CrossOrigin.me](https://crossorigin.me/). etcd2 Discovery URLs aren't particularly sensitive information, so risks associated with using an external service are minimal. If you're concerned about security, you can deploy your own CORS proxy using the open source CrossOrigin.me code on your own machines, and change the url in the `cloud-config.source.js` file.
