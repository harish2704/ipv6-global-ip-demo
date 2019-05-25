# ipv6-global-ip-demo
A simple web application to test whether your ISP provides you 2^64 ipv6 global IP or not

## Usage

* clone the repo
* run `npm install` or `yarn install`
* export environment variable `ETH_DEV` which points to ether net interface with public IPv6 address.
* Run server . Eg: `env ETH_DEV=em1 npm run server`, where em1 is the ether net interface with global IPv6 IP.
* Open [http://127.0.0.1:3553/] in the browser to access the application
