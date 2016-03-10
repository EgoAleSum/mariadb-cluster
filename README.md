# MariaDB + Galera Cluster on CoreOS with Docker

This repository contains the Azure ARM template to create a MariaDB database with Galera Cluster, running inside Docker containers on CoreOS. You can read more about the architecture, and the choices behind it, on [this blog post](http://withblue.ink/2016/03/09/galera-cluster-mariadb-coreos-and-docker-part-1.html).

The file `azuredeploy.json` contains the JSON template for Azure Resource Manager that can be deployed. When setting the parameters, in addition to the usual options (a globally unique name for the storage account, the number of nodes, etc) you will also need to provide a base64-encoded `cloud-config.yaml` file and a SSH public key.

## cloud-config.yaml

The `cloud-config.yaml` file can be generated using the `build-cloud-config.js` script on your machine.

1. Ensure Node.js 5.0 or higher is installed (it will probably work with Node.js 4.x too, but it's not tested). You can download the latest version from: https://nodejs.org/en/
2. Clone this git repository on your machine: `$ git clone https://github.com/EgoAleSum/mariadb-cluster.git`
3. Inside the directory where you clone the repository, install the required npm modules: `$ npm install`
4. Execute the script with: `$ node build-cloud-config.js`

The `build-cloud-config.js` generates two files:

- `cloud-config.yaml` is the generated file, in clear text
- `cloud-config.yaml.b64` is the base64-encoded version of the above; **use this file for with the ARM template**

The script accepts also some optional parameters:

- `--cluster-size`: the *initial* size of the etcd2 cluster, which represents the minimum number of nodes required for a successful bootstrap. Default value: 3. This parameter is ignored if you're passing a value for `--discovery-url`.
- `--discovery-url`: URL for etcd2 discovery. If empty, it will be requested automatically by the script on your behalf.
- `-h` or `--help`: shows help message

## SSH key

**Linux and Mac** users can use the built-in `ssh-keygen` command line utility, which is pre-installed in OSX and most Linux distributions. Execute the following command, and when prompted save to the default location (`~/.ssh/id_rsa`):

    $ ssh-keygen -t rsa -b 4096

Your **public** key will be located in `~/.ssh/id_rsa.pub`.

**Windows** users can generate compatible keys using PuTTYgen, as shown in [this article](https://winscp.net/eng/docs/ui_puttygen). Please make sure you select "SSH-2 RSA" as type, and use 4096 bits for the size for best security.
