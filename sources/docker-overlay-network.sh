#!/bin/sh

# Parameters
OVERLAY_NETWORK_NAME="mariadb-overlay-net"
OVERLAY_NETWORK_SUBNET="192.168.220.0/24"

# Get the hostname of the VM
HOSTNAME=$(hostname)

# Execute this only on the first VM of the cluster
if [[ "$HOSTNAME" == *VM0 ]]; then
    echo "This is the first VM"
    
    # Check if the network exists already
    docker network inspect $OVERLAY_NETWORK_NAME
    if [ $? -ne 0 ]; then
        # Network doesn't exist: create it
        echo "Overlay network does not exist: create it"
        docker network create \
          --driver overlay \
          --subnet=$OVERLAY_NETWORK_SUBNET \
          $OVERLAY_NETWORK_NAME \
          || true
    else
        echo "Overlay network exists already"
    fi
else
    echo "This is not the first VM: doing nothing"
fi
