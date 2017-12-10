#!/bin/sh

# This script updates the status in etcd only after MariaDB is actually initialized and ready to accept connections

# Parameters
IMAGE_NAME="mariadb:{MARIADB_VERSION}"

# Check if the cluster is marked as initialized. If it's already initialized, then just exit successfully
curl --silent --fail http://127.0.0.1:4001/v2/keys/mariadb-galera/initialized > /dev/null
if [ $? -ne 0 ]; then
    sleep 10

    while ! docker run --rm $IMAGE_NAME mysqladmin ping -h mariadb-node-0 --silent; do
        sleep 5
    done

    # Wait 5 more seconds before sending the green light
    sleep 5

    # Server is ready: other nodes can now connect
    curl -L http://127.0.0.1:4001/v2/keys/mariadb-galera/initialized -XPUT -d value="true"
fi
