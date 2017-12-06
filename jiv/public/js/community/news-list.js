$(document).ready(function () {
  var news_option = {
    valueNames: ['news-name', 'news-categories', 'defaultSort', 'news-summary'],
    page: 10,
    plugins: [
      ListPagination({
        paginationClass: 'news-pagination'
      })
    ]
  };
  var _filterNewsList = function () {
    var $els = $('.news-filter:checked');
    if ($els.length > 0) {
      var filters = [];
      $els.each(function () {
        filters.push($(this).val());
      });
      newsList.filter(function (item) {
        var newsFilters = item.values()["news-categories"].trim().split(',');
        if (newsFilters.length >= filters.length) {
          for (var idx in filters) {
            if (newsFilters.indexOf(filters[idx]) <= -1) {
              return false;
            }
          }
          return true;
        } else {
          return false;
        }
      });
    }
    else {
	if(document.getElementById('null-news') == null){
      newsList.filter();//NOTE: Remove Filter
	}
    }
  };
  $('#news-itemsperpage').val(news_option.page);
  if(document.getElementById('null-news') == null){
  var newsList = new List('news-list', news_option);
  //newsList.sort('defaultSort', {order: "asc"}); // LH: This sort was making certain entries always appear at the top of the list
  }
  
  $('#news-showall').click(function () {
    var $el = $(this);
    if ($el.attr('data-showall') == 'false') {
      $el.html('Show ' + membersList.page + ' per page');
      $el.attr('data-showall', true);
      newsList.page = newsList.items.length;
      newsList.update();
      newsList.search();
    }
    else {
      $el.html('Show all');
      $el.attr('data-showall', false);
      newsList.page = $('#news-itemsperpage').val() | 0;
      newsList.update();
    }
    return false;
  });
  $('#news-itemsperpage').change(function () {
    newsList.page = $(this).val() | 0;
    $('#news-showall').attr('data-showall', false).html('Show all');
    newsList.update();
  });

  $('.news-filter').click(function () {
    _filterNewsList();
  });
  var searchaValue = $('#search-box').val();
  _filterNewsList();
  if (searchaValue) {
    newsList.search(searchaValue);
  }
});