'use strict'

// Source for the cloud-config.yaml file
module.exports = {
    // JSON structure for the cloud-config.yaml file
    tree: {
        "write_files": [],
        "coreos": {
            "update": {
                "reboot-strategy": "etcd-lock"
            },
            "etcd2": {
                "discovery": false,
                "advertise-client-urls": "http://$private_ipv4:2379,http://$private_ipv4:4001",
                "initial-advertise-peer-urls": "http://$private_ipv4:2380",
                "listen-client-urls": "http://0.0.0.0:2379,http://0.0.0.0:4001",
                "listen-peer-urls": "http://$private_ipv4:2380"
            },
            "units": []
        }
    },

    // List of files for write_files
    readFiles: {
        'docker-mariadb-galera.sh': {
            'path': '/opt/bin/docker-mariadb-galera.sh',
            'owner': 'root',
            'permissions': '0755'
        },
        'docker-mariadb-waiter.sh': {
            'path': '/opt/bin/docker-mariadb-waiter.sh',
            'owner': 'root',
            'permissions': '0755'
        },
        'etcd-waiter.sh': {
            'path': '/opt/bin/etcd-waiter.sh',
            'owner': 'root',
            'permissions': '0755'
        },
        'mysql_server.cnf': {
            'path': '/opt/mysql.conf.d/mysql_server.cnf',
            'owner': 'root',
            'permissions': '0644'
        }
    },

    // List of systemd units
    units: [
        { 'name': 'docker.service', 'command': 'start' },
        { 'name': 'etcd2.service', 'command': 'start' },
        { 'name': 'docker-mariadb-galera.service', 'command': 'start', 'source': 'docker-mariadb-galera.service' },
        { 'name': 'docker-mariadb-waiter.service', 'command': 'start', 'source': 'docker-mariadb-waiter.service' },
        { 'name': 'etcd-waiter.service', 'command': 'start', 'source': 'etcd-waiter.service' },
    ]
}
