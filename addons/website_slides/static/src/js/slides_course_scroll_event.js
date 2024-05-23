/** @odoo-module **/

import publicWidget from 'web.public.widget';

const {useExternalListener} = owl;

// 监听课程页面滚动事件
publicWidget.registry.websiteSlidesCourseScrollEvent = publicWidget.Widget.extend({
    selector: '#wrapwrap',

    init: function () {
        this._super(...arguments);
        this.scrolledPoint = 300;
        this.courseSidebarElement = undefined;
    },

    start: function () {
        const elements = document.querySelectorAll(".o_wslides_course_sidebar");
        // 是否存在元素
        const hasCourseSidebarElements = elements.length > 0;
        if (hasCourseSidebarElements) {
            this.courseSidebarElement = elements[0];
            this.$el.on('scroll', this._onWindowScroll.bind(this));
        }
        return this._super(...arguments);
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
    _onWindowScroll: function () {
        // Disable css transition if refresh with scrollTop > 0
        const scroll = this.$el.scrollTop();
        const headerIsScrolled = (scroll > this.scrolledPoint);

        if (headerIsScrolled) {
            this.courseSidebarElement.classList.add("o_wslides_course_sidebar_fixed", "col-12", "col-md-4", "col-lg-3");
        } else {
            this.courseSidebarElement.classList.remove("o_wslides_course_sidebar_fixed", "col-12", "col-md-4", "col-lg-3");
        }
    }
});

export default publicWidget.registry.websiteSlidesCourseScrollEvent;
