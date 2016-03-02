#!/bin/sh

# Parameters
OVERLAY_NETWORK_NAME="mariadb-overlay-net"
DATA_DIR="/mnt/resource/data"
IMAGE_NAME="mariadb:10.1"

# Get the hostname of the VM
HOSTNAME=$(hostname)

# Get the ID of the VM from the hostname
HOSTNUM=$(expr "$HOSTNAME" : '.*\([0-9]\)')

# Ensure the folder for MariaDB exists
mkdir -p $DATA_DIR

# Remove pre-existing containers
docker kill mariadb-node-$HOSTNUM || true
docker rm mariadb-node-$HOSTNUM || true

# Pull the latest version of the Docker image
docker pull $IMAGE_NAME

# Check if the cluster is marked as initialized
curl --silent --fail http://127.0.0.1:4001/v2/keys/mariadb-galera/initialized > /dev/null
if [ $? -ne 0 ]; then
    echo "Cluster needs to be initialized"
    
    # Check if this is the first VM (hostname ends in "-VM0") that will initialize the cluster
    if [[ "$HOSTNAME" == *VM0 ]]; then
        echo "VM $HOSTNAME is the first node"
        
        # Start the Docker container
        echo "Starting Docker container (first node)"
        
        docker run \
          --name mariadb-node-$HOSTNUM \
          --net $OVERLAY_NETWORK_NAME \
          -v /opt/mysql.conf.d:/etc/mysql/conf.d \
          -v $DATA_DIR:/var/lib/mysql \
          -e MYSQL_INITDB_SKIP_TZINFO=yes \
          -e MYSQL_ROOT_PASSWORD=my-secret-pw \
          -p 3306:3306 \
          $IMAGE_NAME \
          --wsrep-new-cluster
    else
        echo "This is not the first node: $HOSTNAME"
        
        # Wait for the cluster to be initialized
        until curl --fail http://127.0.0.1:4001/v2/keys/mariadb-galera/initialized; do
          echo "Waiting for initialization..."
          sleep 2
        done
        
        # Create a mysql data folder so the database is not re-initialized
        mkdir -p $DATA_DIR/mysql
        
        # Start container
        echo "Starting Docker container"
        docker run \
          --name mariadb-node-$HOSTNUM \
          --net $OVERLAY_NETWORK_NAME \
          -v /opt/mysql.conf.d:/etc/mysql/conf.d \
          -v $DATA_DIR:/var/lib/mysql \
          -e MYSQL_INITDB_SKIP_TZINFO=yes \
          -e MYSQL_ROOT_PASSWORD=my-secret-pw \
          -p 3306:3306 \
          $IMAGE_NAME
    fi
else
    echo "Cluster is already initialized"
    
    echo "Starting Docker container"
    docker run \
      --name mariadb-node-$HOSTNUM \
      --net $OVERLAY_NETWORK_NAME \
      -v /opt/mysql.conf.d:/etc/mysql/conf.d \
      -v $DATA_DIR:/var/lib/mysql \
      -e MYSQL_INITDB_SKIP_TZINFO=yes \
      -e MYSQL_ROOT_PASSWORD=my-secret-pw \
      -p 3306:3306 \
      $IMAGE_NAME
fi
