$(document).ready(function () {
  console.log("news view happening");
  var _newsSettings = {
    newsTabSltr: '#news-tab-location',
    newsFilterSLtr: '.news-filter'
  };

  var _CycleTopStories = function () {
    var topStoriesLinks = $('#top-news-stories > li > a');
    var currentLink = $('#top-news-stories > li > a.active');
    var currentIdx = parseInt(currentLink.attr('data-index'));
    var nextBtn = $('#nextBtn');
    var prevBtn = $('#prevBtn');

    if (currentIdx < topStoriesLinks.length - 1) {
      nextBtn.show();
      var nextIdx = (currentIdx + 1);
      var nextLink = $('#top-news-stories > li > a[data-index="' + nextIdx + '"]');
      if (nextLink) {
        nextBtn.children().attr('href', nextLink.attr('href'));
      }
    }
    if (currentIdx > 0) {
      prevBtn.show();
      var prevIdx = (currentIdx - 1);
      var prevLink = $('#top-news-stories > li > a[data-index="' + prevIdx + '"]');
      if (prevLink) {
        prevBtn.children().attr('href', prevLink.attr('href'));
      }
    }
  };
  _CycleTopStories();

  $(_newsSettings.newsFilterSLtr).click(function (event) {
    var catValue = $(event.target).val();
    if (catValue) {
      var newsTabLocation = $(_newsSettings.newsTabSltr).attr('href');
      newsTabLocation += "?news-filter=" + encodeURIComponent(catValue) + "#tab_news";
      window.location = newsTabLocation;
    }
  });

  $('#news-search-btn').click(function () {
    var searchTerm = $('#news_search').val();
    var newsTabLocation = $(_newsSettings.newsTabSltr).attr('href');
    newsTabLocation += "?news-keyword=" + encodeURIComponent(searchTerm) + "#tab_news";
    console.log(newsTabLocation);
    window.location = newsTabLocation;
  });

});