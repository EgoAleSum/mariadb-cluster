#!/bin/bash

# List disks that need to be formatted
#lsblk | awk '/^sd/ { a[$1] = 1 } /^.-/ { sub(/[`|]-/, "", $1) ; sub(/[0-9]/, "", $1) ; a[$1] = 0 } END { for(x in a) { if(a[x]) { print x }} } '

DISKS=$(lsblk | awk '/^sd/ { a[$1] = 1 } /^.-/ { sub(/[`|]-/, "", $1) ; sub(/[0-9]/, "", $1) ; a[$1] = 0 } END { for(x in a) { if(a[x]) { print x }} } ')
COUNT=$(echo $DISKS | wc -w)

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
mdadm --create /dev/md0 --level 0 --raid-devices $COUNT $PARTITIONS

# Crete an ext4 partition on md0
mkfs -t ext4 /dev/md0
