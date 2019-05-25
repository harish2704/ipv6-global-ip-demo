/*
 * static/app.js
 * Created: Sat May 25 2019 22:14:15 GMT+0530 (IST)
 * Copyright 2019 Harish.K<harish2704@gmail.com>
 */

function api( method, url, data ){
  const opts = {
    method,
  };
  if( data ){
    opts.headers = {
      'Content-Type': 'application/json',
    };
    opts.body = JSON.stringify( data );
  }
  return fetch( url, opts )
    .then(function(response) {
      if( response.status === 200 ){
        return response.json();
      }
      return response.json().then( v =>{
        throw v;
      });
    });
}


var app = new Vue({
  el: '#app',
  data: {
    ips: ['Loading....'],
  },
  mounted(){
    this.updateIpList();
  },
  methods:{
    updateIpList(){
      api('get', 'ips')
        .then( res => this.ips = res.ips );
    },
    addIp(){
      const ip = this.$refs.ip.value;
      api('post', 'ips', { ip })
        .then( res =>{
          this.ips = res.ips;
        })
        .catch( res =>{
          console.log( res );
          // alert( res.error )
        });
    }
  }
});

