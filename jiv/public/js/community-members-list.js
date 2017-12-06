var members_options = {
  valueNames: ['orgName', 'tagLine', 'marketArea', 'orgRole', 'orgType'],
  page: 10,
  plugins: [
    ListPagination({
      paginationClass: 'members-pagination'
    })
  ]
};

var membersList = new List('members-list', members_options);
$('.members-filter').click(function () {
  var $els = $('.members-filter:checked');
  if ($els.length > 0) {
    var filters = [];
    $els.each(function () {
      filters.push($(this).val());
    });
    membersList.filter(function (item) {
      var orgRoles = item.values().orgRole.trim().split(',');
      if (orgRoles.length >= filters.length) {
        for(var idx in filters){
          if(orgRoles.indexOf(filters[idx]) <= -1)
          {
            if (item.values().orgType == filters) {
                return true;
            } else {
                return false;
            }
          }
        }
        return true;
      } else {
       if (item.values().orgType == filters) {
        return true;
      } else {
        return false;
      }
      } 
    });
  }
  else {
    membersList.filter();//NOTE: Remove Filter
  }
});

$('#members-itemsperpage').val(members_options.page);

$('#members-showall').click(function () {
  var $el = $(this);
  if ($el.attr('data-showall') == 'false') {
    $el.html('Show ' + membersList.page + ' per page');
    $el.attr('data-showall', true);
    membersList.page = membersList.items.length;
    membersList.update();
    membersList.search();
  }
  else {

    $el.html('Show all');

    $el.attr('data-showall', false);
    membersList.page = $('#members-itemsperpage').val() | 0;
    membersList.update();
  }
  return false;
});
$('#members-itemsperpage').change(function () {
  membersList.page = $(this).val() | 0;
  $('#members-showall').attr('data-showall', false).html('Show all');
  membersList.update();
});

