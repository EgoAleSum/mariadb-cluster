#!/bin/bash

echo "create-raid-array.sh started"

# Execute this only if the md0 raid array doesn't exist already
lsblk | grep \\-md0
if [ $? -ne 0 ]; then

echo "Need to create raid array"

# List disks that need to be formatted
DISKS=$(lsblk | awk '/^sd/ { a[$1] = 1 } /^.-/ { sub(/[`|]-/, "", $1) ; sub(/[0-9]/, "", $1) ; a[$1] = 0 } END { for(x in a) { if(a[x]) { print x }} } ')
COUNT=$(echo $DISKS | wc -w)

echo "$COUNT disks: $DISKS \nRun fdisk"

# Format all disks
for i in $DISKS; do
echo "n
p
1


t
fd
w
" | fdisk "/dev/$i"; done

# Create the raid array md0
PARTITIONS=""
for i in $DISKS; do
    PARTITIONS+="/dev/${i}1 "
done
echo "Run mdadm on $PARTITIONS"
mdadm --create /dev/md0 --level 0 --raid-devices $COUNT $PARTITIONS

# Crete an ext4 partition on md0
echo "Create ext4 volume"
# TODO: Test this: "-E lazy_itable_init"
mkfs -t ext4 /dev/md0

echo "Done!"

# If md0 exists already
else

echo "Raid array created already. Nothing to do here"

fi
