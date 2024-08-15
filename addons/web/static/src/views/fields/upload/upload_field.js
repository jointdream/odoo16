/** @odoo-module **/

import { _lt } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";
import { useOwnedDialogs } from "@web/core/utils/hooks";
import { isBinarySize, toBase64Length } from "@web/core/utils/binary";
import { download } from "@web/core/network/download";
import { standardFieldProps } from "../standard_field_props";
import { FileUploader } from "../file_handler";
import { PreviewDialog } from "../preview_dialog/preview_dialog";

import { Component, onWillUpdateProps, useState } from "@odoo/owl";

const MAX_FILENAME_SIZE_BYTES = 0xff; // filenames do not exceed 255 bytes on Linux/Windows/MacOS
const DEFAULT_ACCEPTED_FILE_EXTENSIONS = "image/*, application/pdf";

export function usePreviewDialog() {
  const addDialog = useOwnedDialogs();

  async function openPreviewDialog(params) {
    addDialog(PreviewDialog, params);
  }

  return openPreviewDialog;
}

export class UploadField extends Component {
  setup() {
    this.previewDialog = usePreviewDialog();
    this.state = useState({
      fileName: this.props.record.data[this.props.fileNameField] || "",
      fileObject: undefined,
      fileMineType: "",
      originalFileName: this.props.record.data[this.props.fileNameField] || "",
      originalFileMineType: "",
      originalFileValue: this.props.value,
      originalFileObject: undefined,
    });

    if (this.props.value) {
      this.initOriginalFile();
    }

    onWillUpdateProps((nextProps) => {
      if (nextProps.value !== this.state.originalFileValue) {
        this.state.fileName =
          nextProps.record.data[nextProps.fileNameField] || "";
      } else {
        console.log("Discard changes");
        this.state.fileName = this.state.originalFileName;
        this.state.fileMineType = this.state.originalFileMineType;
        this.state.fileObject = this.state.originalFileObject;
      }
    });
  }

  initOriginalFile() {
    const additionalParams = {
      model: this.props.record.resModel,
      id: this.props.record.resId,
      field: this.props.name,
      filename: this.fileName || "",
      download: true,
    };
    const paramsString = new URLSearchParams(additionalParams).toString();
    const url = `/web/content?${paramsString}`;

    fetch(url, {
      method: "GET",
    })
      .then((response) => {
        if (!response.ok) {
          console.warn(`Failed fetch file content! status: ${response.status}`);
        }
        return response.blob(); // 将响应体转换为Blob
      })
      .then((blob) => {
        this.state.fileMineType = blob.type;
        this.state.originalFileMineType = blob.type;

        this.state.fileObject = blob;
        this.state.originalFileObject = blob;
      })
      .catch((error) => {
        console.error("Fetch File Content error:", error);
      });
  }

  get defaultAcceptedFileExtensions() {
    return DEFAULT_ACCEPTED_FILE_EXTENSIONS;
  }

  get fileName() {
    return (
      this.state.fileName ||
      this.props.fileNameField ||
      this.props.value ||
      ""
    ).slice(0, toBase64Length(MAX_FILENAME_SIZE_BYTES));
  }

  get fileMineType() {
    return this.state.fileMineType;
  }

  get extension() {
    const lastSlashIndex = this.state.fileMineType.lastIndexOf("/");
    if (lastSlashIndex !== -1) {
      return this.state.fileMineType.substring(lastSlashIndex + 1);
    }
    return "";
  }

  update({ data, name, type }) {
    this.state.fileName = name || "";
    this.state.fileMineType = type || "";
    this.state.fileObject = data;

    if (data && type) {
      const decoded = atob(data);
      const buffer = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) {
        buffer[i] = decoded.charCodeAt(i);
      }
      const blob = new Blob([buffer], { type });
      this.state.fileObject = blob;
    }

    const { fileNameField, record } = this.props;
    const changes = { [this.props.name]: data || false };
    if (fileNameField in record.fields && record.data[fileNameField] !== name) {
      changes[fileNameField] = name || false;
    }
    return this.props.record.update(changes);
  }

  triggerPreview() {
    if (this.isImage() || this.isPdf()) {
      this.previewDialog({
        fileObject: this.state.fileObject,
        fileMineType: this.state.fileMineType,
        fileName: this.fileName,
        record: this.props.record,
      });
    } else {
      this.onFileDownload();
    }
  }

  isImage() {
    const imageMimetypes = [
      "image/bmp",
      "image/gif",
      "image/jpeg",
      "image/png",
      "image/svg+xml",
      "image/tiff",
      "image/x-icon",
    ];
    return imageMimetypes.includes(this.state.fileMineType);
  }

  isPdf() {
    return this.state.fileMineType === "application/pdf";
  }

  localFileDownload() {
    const url = URL.createObjectURL(this.state.fileObject);
    const link = document.createElement("a");
    link.href = url;
    link.download = this.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async onFileDownload() {
    if (this.state.fileObject) {
      return this.localFileDownload();
    }
    await download({
      data: {
        model: this.props.record.resModel,
        id: this.props.record.resId,
        field: this.props.name,
        filename_field: this.fileName,
        filename: this.fileName || "",
        download: true,
        data: isBinarySize(this.props.value) ? null : this.props.value,
      },
      url: "/web/content",
    });
  }

  onFileRemove() {
    this.update({});
  }

  onFileUploaded({ data, name, type }) {
    this.update({ data, name, type });
  }
}

UploadField.template = "web.UploadField";
UploadField.components = {
  FileUploader,
};
UploadField.props = {
  ...standardFieldProps,
  fileNameField: { type: String, optional: true },
  previewImage: { type: String, optional: true },
};

UploadField.displayName = _lt("Upload");
UploadField.supportedTypes = ["binary"];

UploadField.extractProps = ({ attrs }) => {
  return {
    fileNameField: attrs.filename,
    previewImage: attrs.options.preview_image,
  };
};

registry.category("fields").add("upload", UploadField);
