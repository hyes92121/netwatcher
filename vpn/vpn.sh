#!/bin/bash
## add ip rule if not added
echo "--------------------"
echo Local routes setting check
TABLE_EXIST=`ip rule show | grep "from 140.112.42.160 lookup 128 "| wc -l`
if (( $TABLE_EXIST == 0))
then	
	sudo ip rule add table 128 from 140.112.42.160
	echo "New rule added"
fi 
## add routes to table 128 if not added
ROUTE_1_EXIST=`ip route show table 128 | grep "default via 140.112.42.254 dev enp3s0" | wc -l`
ROUTE_2_EXIST=`ip route show table 128 | grep "140.112.42.0/24 dev enp3s0 scope link " | wc -l`
if (( $ROUTE_1_EXIST == 0))
then	
	sudo ip route add table 128 default via 140.112.42.254
	echo "New route added to table 128"
fi 
if (( $ROUTE_2_EXIST == 0))
then	
	sudo ip route add table 128 to 140.112.42.0/24 dev enp3s0
	echo "New route added to table 128"
fi 
echo Check completed
echo "--------------------"
echo Connect to nord vpn server 
dir="/etc/openvpn/ovpn_tcp"
authfile="/etc/openvpn/client/auth.txt"
COUNTRYIDS=(0 2 10 13 14 21 30 33 38 74 80 81 84 97 99 108 140 114 208 195 227 228) 
while :; do
	echo "Select a country"
	echo " 1 - Albania"
	echo " 2 - Argentina"
	echo " 3 - Australia"
	echo " 4 - Austria"
	echo " 5 - Belgium"
	echo " 6 - Brazil"
	echo " 7 - Bulgaria"
	echo " 8 - Canada"
	echo " 9 - France"
	echo " 10 - Georgia"
	echo " 11 - Germany"
	echo " 12 - Greece"
	echo " 13 - Hong Kong"
	echo " 14 - Iceland"
	echo " 15 - Japan"
	echo " 16 - Mexico"
	echo " 17 - South Korea"
	echo " 18 - Swedan"
	echo " 19 - Singapore"
	echo " 20 - United Kingdom"
	echo " 21 - United States"
	echo " 0 - EXIT"
	read -p " Select:" selection
	[[ $selection =~ ^[0-9]+$ ]] || { echo "Enter a valid id"; continue; }
	if (($selection >= 0 && $selection <= 21)); then
    		break
	else 
		echo "try again"
	fi
done
if(( $selection > 0))
then
	countryid=${COUNTRYIDS[$selection]}
	startstring='https://nordvpn.com/wp-admin/admin-ajax.php?action=servers_recommendations&filters=\{%22country_id%22:'
	endstring='\}'
	url=$startstring$countryid$endstring
	echo "Recommended VPN servers for this country:" 
	curl --silent $url | jq --raw-output 'limit(3;.[]) | "Server: \(.name)\nHostname: \(.hostname)\n"'
	#ls $dir | grep tcp.ovpn
	read -p "Input a server ID and press [ENTER to connect](e.g au23):" servername
	serverfile="${dir}/${servername}.nordvpn.com.tcp.ovpn"
	#add --daemon to run in bg
	sudo openvpn --config "$serverfile"  --auth-user-pass "$authfile"
fi


