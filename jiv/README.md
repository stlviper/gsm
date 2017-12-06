## Installing Dependencies

# Installing NodeJS
Grunt runs in node so if node is already installed on your machine then you can skip this part. If you are using OSX use this command ```brew install nodejs``` to get the most recent stable release. If you are using ubuntu you can install it with apt-get, ```apt-get install -y nodejs``` and RHEL  can use yum,```yum install -y nodejs```. Window can use the installer provided on [NodeJS site][nodejs_site].

NOTE: If brew is not installed then run ```ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"```

# Running project

The project has different config settings that can be seen in the ```./configs```. 

- Development: ```NODE_ENV=development node bin/www```
- Demo: ```NODE_ENV=demo node bin/www```
- Production: ```NODE_ENV=production node bin/www```

__Note__: If no enviroment is set then it will default to development


# Theme Changing
Temporarily theme changes are done in app.js. Eventually they will be dynamic based on a config setting or the particular vhost, subdomain or path.
Change the word default in the following line in app.js to the name of the theme folder in views/themes you wish to use.

```
app.set('view options', {layout: 'themes/{layoutname}/layout'});
app.use('/images/theme',  express.static(__dirname + '/public/images/themes/{layoutname}'));
```

# Rendering UI

When rendering the Handlebar template for each page there is a set of user information that will be included if the user is logged in. If this informaiton is not
on the page then they are not an authenticated user and should be treated so. When they are signed in the object userinfo will be available on each
template. Here is the information this object holds

* username: ...it is what it is
* firstName: User First Name
* lastName: User Last name
* orgDuns: the DUNs number of the organization that user is part of
* isAdmin: If true then this user is an Admin
* isUser: Represents a basic users(All users will have this if they are active)
* role: This is the role of the organization that user is part of.
* email: req.user.email,
* id: req.user.id


# Theme Template

To create a new theme, 

* Copy public/css/template_theme.css into a new css file in the same folder.
* Copy the views/themes/template folder to a new folder in the same path and name it what you want your theme to be named.
* In your theme folder, in layout.html, modify the template_theme.css style link to point to your new css file you created above.
* Also in layout.html, modify the 2 handlebar partials and change the word template (example template/header) to the name of the folder you created with /header (example newTemplateName/header)

# Handlebar Partials

If a partial needs a particular js function or references in order for it to function properly then use the ```{{#contentFor}}``` helper as seen in the following example
this will add to the page script place holder in the layout. This can be custom JS scripts or reference to JS files.

```
  {{#contentFor 'pageScripts'}}
    <script type="application/javascript">
    </script>
  {{/contentFor}}
```

# Unit Tests

For the unit tests we are using Mocha along with Grunt. Mocha will allow us to run BBD tests on the front end and back end code. For more
information about mocha checkout [mochajs.org][mocha_site] or for information on the grunt plugin checkout the [github repo][grunt_mocha_github]

[grunt_mocha_github]: https://github.com/kmiyashiro/grunt-mocha
[mocha_site]: http://mochajs.org/


# Approval Notifications

The approval notificaitons are handled by the ./utils/notifier and that notifier behaves like a CRON job. When it is ran can be set in the config file. The process is
started in the ./bin/www file.


[nodejs_site]: http://nodejs.org/
