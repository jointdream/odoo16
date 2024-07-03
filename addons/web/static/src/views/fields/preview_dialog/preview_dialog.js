/** @odoo-module **/

import { Dialog } from "@web/core/dialog/dialog";
import { useService } from "@web/core/utils/hooks";

import { Component } from "@odoo/owl";

export class PreviewDialog extends Component {
  setup() {
    this.notification = useService("notification");
  }

  get pdfUrl() {
    const url = URL.createObjectURL(this.props.fileObject);
    const file = encodeURIComponent(url);
    return `/web/static/lib/pdfjs/web/viewer.html?file=${file}`;
  }

  get imgUrl() {
    return URL.createObjectURL(this.props.fileObject);
  }

  get isImage() {
    const imageMimetypes = [
      "image/bmp",
      "image/gif",
      "image/jpeg",
      "image/png",
      "image/svg+xml",
      "image/tiff",
      "image/x-icon",
    ];
    return imageMimetypes.includes(this.props.fileMineType);
  }

  get isPdf() {
    return this.props.fileMineType === "application/pdf";
  }

  onLoadFailed() {
    this.notification.add(this.env._t("Could not display the selected pdf"), {
      type: "danger",
    });
  }
}

PreviewDialog.template = "web.PreviewDialog";
PreviewDialog.components = { Dialog };
