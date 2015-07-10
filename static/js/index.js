$(document).ready(function() {
    backToTop();
});

function backToTop() {
    $(window).scroll(function() {
        if ($(window).scrollTop() > 100) {
            $("#top").fadeIn(500);
        } else {
            $("#top").fadeOut(500);
        }
    });

    $("#top").click(function() {
        $("body").animate({
            scrollTop: "0"
        }, 500);
    });

    $(function() {
        $('[data-toggle="tooltip"]').tooltip();
    });
}
