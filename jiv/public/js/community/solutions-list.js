$(document).ready(function () {

  var capabilities_options = {
    valueNames: ['capabilityName', 'orgName', 'categories'],
    page: 10,
    plugins: [
      ListPagination({
        paginationClass: 'capabilities-pagination'
      })
    ]
  };
  if(document.getElementById('null-capabilities') == null){
  var capabilitiesList = new List('capabilities-list', capabilities_options);
  }
  $('#capabilities-itemsperpage').val(capabilities_options.page);

  $('#capabilitiesOptions').multiselect({
    onChange: function (option, checked) {
      var $els = option;
      if (checked == true) {
        var filters = [];
        $els.each(function () {
          filters.push($(this).val());
        });
        capabilitiesList.filter(function (item) {
          var categories = item.values().categories.trim().split(',');
          if (categories.length >= filters.length) {
            for (var idx in filters) {
              if (categories.indexOf(filters[idx]) <= -1) {
                return false;
              }
            }
            return true;
          } else {
            return false;
          }
        });
        capabilities_options.update();
        $('#capabilities-posts').children('.item').matchHeight({byRow: false});
      }
      else {
        capabilitiesList.filter();//NOTE: Remove Filter
        capabilitiesList.update();
        $('#capabilities-posts').children('.item').matchHeight({byRow: false});
      }
    }
  });
  $('#capabilities-showall').click(function () {

    var $el = $(this);
    if ($el.attr('data-showall') == 'false') {

      $el.html('Show ' + capabilitiesList.page + ' per page');
      $el.attr('data-showall', true);
      capabilitiesList.page = capabilitiesList.items.length;
      capabilitiesList.search();
      $('#capabilities-posts').children().removeAttr('style');
    }
    else {
      $el.html('Show all');
      $el.attr('data-showall', false);
      capabilitiesList.page = $('#capabilities-itemsperpage').val() | 0;
    }
    capabilitiesList.update();
    $('#capabilities-posts').children('.item').matchHeight({byRow: false});
    return false;
  });
  $('#capabilities-itemsperpage').change(function () {
    capabilitiesList.page = $(this).val() | 0;
    $('#capabilities-showall').attr('data-showall', false).html('Show all');
    capabilitiesList.update();
    $('#capabilities-posts').children('.item').matchHeight({byRow: false});
  });


  $('#capabilityCreate').validate({
    rules: {
      capabilityName: {
        required: true
      },
      pocEmail: {
        required: true,
        email: true
      },
      pocName: {
        required: true
      },
      webLink: {
        required: true,
        url: true
      },
      uploadLogoURI: {
        required: false
      },
      capabilityDescription: {
        required: true
      },
      certify: {
        required: true
      },
      meetsFar: {
        required: true
      }
    },
    ignore: ":hidden:not(#uploadLogoURI)",
    highlight: function (element) {
      $(element).closest('.control-group').removeClass('success').addClass('error');
    },
    submitHandler: function (form) {

      var form = $("#capabilityCreate");
      var _settings = {
        myCommunitiesSltr: '#my-capabilities',
        templateCardSltr: '#capabilities-template'
      };

      $.ajax({
        url: form.attr("action"),
        type: "POST",
        dataType: 'json',
        data: form.serialize(),

        success: function (data) {
          //$('#capabilitiesFieldset').hide();
          $('#newCapabilityMessage').show();

          var $newCard = $($(_settings.templateCardSltr).clone());
          var _containers = {
            solutions: null
          };
          var avatarInput = document.createElement('input');
          $(avatarInput).attr('type', 'hidden');
          $(avatarInput).attr('class', 'form-control');
          $(avatarInput).attr('name', 'uploadLogoURI');
          $(avatarInput).attr('id', 'uploadLogoURI');
          var newAvatarDiv = document.createElement('div');
          $(newAvatarDiv).attr('id', 'avatar_dealio');
          var avatarButton = document.createElement('button');
          $(avatarButton).attr('type', 'button');
          $(avatarButton).attr('id', 'crop-button');
          $(avatarButton).attr('class', 'aui-button aui-button-primary');
          $(avatarButton).text('Save Image');
          $(newAvatarDiv).append(avatarButton);
          $('#avatarDiv').empty();
          $('#avatarDiv').append(avatarInput);
          $('#avatarDiv').append(newAvatarDiv);


          var alertDiv = document.createElement('div');
          $(alertDiv).attr('class', 'alert alert-success');
          $(alertDiv).text('Your capability has been successfully submitted!');
          ;
          var $avatar_dealio = $("#avatar_dealio"),
            $cropButton = $('#crop-button'),
            $output = $("#output");

          $avatar_dealio.prepend(Handlebars.templates['image-upload-and-crop']({}));

          var imageUploadAndCrop = new ImageUploadAndCrop($avatar_dealio.find('.image-upload-and-crop-container'),
            {
              cropButton: $cropButton,
              onCrop: function (croppedDataURI) {
                $output.find("img").attr('src', croppedDataURI);
                $("#uploadLogoURI").val(croppedDataURI);
                $output.show();
              },
              onImageUpload: function () {
                $cropButton.show();
              },
              onImageUploadError: function () {
                $cropButton.hide();
              }
            }
          );

          _containers.posts = $('#capabilities-posts');
          var urlFriendlyName = data[3];
          $newCard.find('#topCapabilitiesLink').attr('href', '/capabilities/' + urlFriendlyName);
          $newCard.find('#bottomCapabilitiesLink').attr('href', '/capabilities/' + urlFriendlyName);
          $newCard.find('#moreCapabilitiesLink').attr('href', '/capabilities/' + urlFriendlyName);
          $newCard.find('div.capabilities-list > a > h3.capabilityName').html(data[0].capabilityName + " <span class='badge gsm-teal-bg baseline-shift'>NEW</span>");
          $newCard.find('h4.orgName').html(data[2]);
          $newCard.find('span.categories').html(data[0].category);
          if (data[1]) {
            $newCard.find('div.well > a > div.thumb > img').attr('src', data[1])
              .attr('alt', data[0].capabilityName);
          } else {
            $newCard.find('div.well > a > div.thumb > img').attr('src', '/images/logo-default.png')
              .attr('alt', data[0].capabilityName);
          }
          $('#capabilities-posts').isotope(); // Is this line covering up a deeper problem?
          _containers.posts.prepend($newCard)
            .isotope('prepended', $newCard).isotope('layout');
        },
        error: function (xhr, status, error) {
          var alertDiv = document.createElement('div');
          $(alertDiv).attr('class', 'alert alert-danger');
          $(alertDiv).text('There was an error with your request, please try again.');
        }

      });

    }
  });

  $('#category')
    .on('tokenfield:createdtoken', function(e) {
      console.log("token created");
      $('#category-tokenfield').attr('placeholder', '');
    })
    .on('tokenfield:removedtoken', function(e) {
      if($('#category').tokenfield('getTokens').length === 0) {
        $('#category-tokenfield').attr('placeholder', 'Categories');
      }
    });
});
