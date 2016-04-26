#!/bin/sh

# Parameters
DATA_DIR="/mnt/data"
IMAGE_NAME="mariadb:10.1"

# Get the hostname of the VM
HOSTNAME=$(hostname)

# Get the ID of the VM from the hostname (single-digit)
HOSTNUM=$(expr "$HOSTNAME" : '.*\([0-9]\)')

# Get the IP of the eth0 interface
HOSTIP=$(ip -4 addr ls eth0 | awk '/inet / {print $2}' | cut -d"/" -f1)

# Ensure the folder for MariaDB exists
mkdir -p $DATA_DIR

# Remove pre-existing containers
docker kill mariadb-container-$HOSTNUM || true
docker rm mariadb-container-$HOSTNUM || true

# Pull the latest version of the Docker image
docker pull $IMAGE_NAME

# Check if the cluster is marked as initialized
curl --silent --fail http://127.0.0.1:4001/v2/keys/mariadb-galera/initialized > /dev/null
if [ $? -ne 0 ]; then
    echo "Cluster needs to be initialized"
    
    # Check if this is the first VM (hostname ends in "node-0") that will initialize the cluster
    if [[ "$HOSTNAME" == *node-0 ]]; then
        echo "VM $HOSTNAME is the first node ($HOSTIP)"
        
        # Start the Docker container
        echo "Starting Docker container (first node)"
        
        docker run \
          --name mariadb-container-$HOSTNUM \
          -v /opt/mysql.conf.d:/etc/mysql/conf.d \
          -v $DATA_DIR:/var/lib/mysql \
          -e MYSQL_INITDB_SKIP_TZINFO=yes \
          -e MYSQL_ROOT_PASSWORD=my-secret-pw \
          -p 3306:3306 \
          -p 4567:4567/udp \
          -p 4567-4568:4567-4568 \
          -p 4444:4444 \
          $IMAGE_NAME \
          --wsrep-new-cluster \
          --wsrep_node_address=$HOSTIP
    else
        echo "This is not the first node: $HOSTNAME ($HOSTIP)"
        
        # Wait for the cluster to be initialized
        until curl --fail http://127.0.0.1:4001/v2/keys/mariadb-galera/initialized; do
          echo "Waiting for initialization..."
          sleep 2
        done
        
        # Touch the mysql data folder so the database is not re-initialized
        mkdir -p $DATA_DIR/mysql
        
        # Start container
        echo "Starting Docker container"
        docker run \
          --name mariadb-container-$HOSTNUM \
          -v /opt/mysql.conf.d:/etc/mysql/conf.d \
          -v $DATA_DIR:/var/lib/mysql \
          -p 3306:3306 \
          -p 4567:4567/udp \
          -p 4567-4568:4567-4568 \
          -p 4444:4444 \
          $IMAGE_NAME \
          --wsrep_node_address=$HOSTIP
    fi
else
    echo "Cluster is already initialized. Node: $HOSTNAME ($HOSTIP)"
    
    echo "Starting Docker container"
    docker run \
      --name mariadb-container-$HOSTNUM \
      -v /opt/mysql.conf.d:/etc/mysql/conf.d \
      -v $DATA_DIR:/var/lib/mysql \
      -p 3306:3306 \
      -p 4567:4567/udp \
      -p 4567-4568:4567-4568 \
      -p 4444:4444 \
      $IMAGE_NAME \
      --wsrep_node_address=$HOSTIP
fi
