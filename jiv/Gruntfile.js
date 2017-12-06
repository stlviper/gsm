module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha');
  grunt.loadNpmTasks('grunt-mocha-test');
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    dirs: {
      source: '/',
      test: '/test',
      stage: '/dist/stage',
      release: '/dist/release'
    },
    //  JSHINT Configuration
    //=========================================================================
    jshint: {
      options: {
        reporter: require('jshint-stylish')
      },
      files: [
        './Gruntfile.js',
        './**/*.js',
        '!./**/node_modules/**/*.js',
        '!./**/*.min.js',
        '!./public/js/libs/**/*.js',
        '!./public/js/jquery-ui.js'
      ]
    },
    // Watch configurations
    //=========================================================================
    watch: {
      files: ['./Gruntfile.js', '!**/*.min.js', '!**/node_modules/**/*.js'],
      tasks: ['jshint']
    },
    mocha: {
      test: {
        src: ['test/client/**/*.html']
      }
    },
    mochaTest: {
      test:{
        src: ['test/server/**/*.js']
      }
    },

    shell: {
      version: {
        command: [/*'git rev-parse HEAD > ./views/partials/version.hbs',*/
          'git rev-parse --short HEAD > ./views/partials/version.hbs',
          'git rev-list --count master >> ./views/partials/version.hbs',
          'date >> ./views/partials/version.hbs']
          .join('&&')
      },
      clean: {
        command: ['rm -f ./version.txt'].join('&&')
      },
      compress: {
        command: [
            'rm -rf deploy',
            'mkdir -p deploy',
            'tar zcf deploy/jiv.tar.gz  --exclude "deploy/*" --exclude "node_modules/*" *'
        ].join('&&')
      }
    }

  });

  // Register Tasks
  //=========================================================================
  grunt.registerTask('jshint_task', ['jshint']);
  grunt.registerTask('test-serverSide', ['mochaTest']);
  grunt.registerTask('test-clientSide', ['mocha']);
  grunt.registerTask('test', ['mochaTest', 'mocha']);
  grunt.registerTask('version_task', ['shell:version']);
  grunt.registerTask('compress', ['shell']);


  grunt.registerTask('default', ['jshint_task', 'test-serverSide', 'test-clientSide', 'test', 'compress']);

};