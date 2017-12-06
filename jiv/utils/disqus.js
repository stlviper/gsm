var CryptoJS = require('crypto-js'),
  cfg = require('../config');

//var DISQUS_PUBLIC = "Tgu9TflnIDPHfTh7l88adTysG7V89XrfOG0RmGvutoPf4a46EPqXBobsnlvPrZ4h";
//var DISQUS_SECRET = "pt2Jdt8P0U6f8eSG6Eo7lgokLYlbpsUZo8F1fx4pSTbl6KhsRThNpSV6X7f3ZBzQ";


function disqusSignon(user) {

  var disqusData = {
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar
  };

  var disqusStr = JSON.stringify(disqusData);
  var timestamp = Math.round(+new Date() / 1000);

  /*
   * Note that `Buffer` is part of node.js
   * For pure Javascript or client-side methods of
   * converting to base64, refer to this link:
   * http://stackoverflow.com/questions/246801/how-can-you-encode-a-string-to-base64-in-javascript
   */
  var message = new Buffer(disqusStr).toString('base64');

  /*
   * CryptoJS is required for hashing (included in dir)
   * https://code.google.com/p/crypto-js/
   */
  var result = CryptoJS.HmacSHA1( message + " " + timestamp, cfg.disqus.secretKey);
  var hexsig = CryptoJS.enc.Hex.stringify(result);

  return {
    pubKey: cfg.disqus.publicKey,
    auth: message + " " + hexsig + " " + timestamp
  };
}

module.exports = {
  id: null,
  username: null,
  email: null,
  getDisqusSSO: function(res) {
    if (res && res.locals.userinfo) {
      this.id = res.locals.userinfo.id;
      this.email = res.locals.userinfo.email;
      this.username = res.locals.userinfo.firstName + ' ' + res.locals.userinfo.lastName;
      this.avatar = res.locals.userinfo.avatarFull
    }
    if (!this.id || !this.username || !this.email) {
      return '';
    }
    var signOnData = disqusSignon({id: this.id, username: this.username, email: this.email, avatar: this.avatar});
    return '<script type="text/javascript"> ' +
        'var disqus_config = function() { this.page.remote_auth_s3 = "'+signOnData.auth+'"; this.page.api_key = "'+signOnData.pubKey+'";} ' +
      '</script>';
  }
};

/*

var user = {
  id: '234234243',
  username: 'goobs',
  email: 'goobs@mail.com'
  };

console.log(disqusSignon(user));*/
