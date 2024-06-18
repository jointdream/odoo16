odoo.define("portal.agent_application", function (require) {
  "use strict";

  const publicWidget = require("web.public.widget");
  const VariantMixin = require("website_sale.VariantMixin");
  const wSaleUtils = require("website_sale.utils");
  const cartHandlerMixin = wSaleUtils.cartHandlerMixin;

  publicWidget.registry.AgentApplication = publicWidget.Widget.extend(
    VariantMixin,
    cartHandlerMixin,
    {
      selector: ".oe_website_agent_application",
      events: _.extend({}, VariantMixin.events || {}, {
        "change #div_has_driver_license select": "_onChangeCertificateType",
        'change select[name="country_id"]': "_onChangeCountry",
        'change select[name="state_id"]': "_onChangeState",
        "change #div_license_type select": "_onChangeLicenseType",
        "change #div_agent_is_currently_licensed select": "_onChangeLicense",
        "change #div_w9_type select": "_onChangeW9Type",
        "change #div_federal_tax_type select": "_onChangeFederalTaxType",
        "change #div_has_NMLS_license select": "_onChangeBqLoanOfficers",
        "click .step-next-button": "_onClickStepNextButton",
        "click .step-prev-button": "_onClickStepPrevButton",
        "click .steps-item-container": "_onClickStepsItemContainer",
        "change #div_other_license_file input": "_onChangeOtherLicenseFile",
        "change #div_driver_license_file input": "_onChangeCommonFile",
        "change #div_w9_file input": "_onChangeCommonFile",
        "change #div_id_file_p1 input": "_onChangeCommonFile",
        "change #div_id_file_p2 input": "_onChangeCommonFile",
        "change #div_photo_file input": "_onChangeCommonFile",
        "change #div_working_languages input": "_onChangeWorkingLanguages",
      }),

      /**
       * @constructor
       */
      init: function () {
        this._super.apply(this, arguments);

        this._changeCountry = _.debounce(this._changeCountry.bind(this), 500);
        this._changeState = _.debounce(this._changeState.bind(this), 500);

        this.currentStep = 1;
      },
      /**
       * @override
       */
      start() {
        const def = this._super(...arguments);

        this._onChangeLicenseType({
          target: $("#div_license_type select")[0],
        });
        this._onChangeFederalTaxType({
          target: $("#div_federal_tax_type select")[0],
        });
        this._onChangeCertificateType({
          target: $("#div_has_driver_license select")[0],
        });
        this._onChangeBqLoanOfficers({
          target: $("#div_has_NMLS_license select")[0],
        });

        this._onChangeW9Type({
          target: $("#div_w9_type select")[0],
        });
        this._onChangeLicense({
          target: $("#div_agent_is_currently_licensed select")[0],
        });
        this._onChangeWorkingLanguages({
          target: $("#div_working_languages input")[0],
        });
        this.$('select[name="country_id"]').change();

        return def;
      },
      destroy() {
        this._super.apply(this, arguments);
      },
      _onChangeCertificateType: function (ev) {
        if (this.$(ev.target).val() == "False") {
          this.$("#div_other_license_type input").show();
          this.$("#div_other_license_type input").prop("required", true);
        } else {
          this.$("#div_other_license_type input").hide();
          this.$("#div_other_license_type input").prop("required", false);
        }
      },
      _onChangeLicenseType: function (ev) {
        if (this.$(ev.target).val() == "other") {
          this.$("#div_license_type_other input").prop("required", true).show();
        } else {
          this.$("#div_license_type_other input")
            .prop("required", false)
            .hide();
        }
      },
      _onChangeLicense: function (ev) {
        const isSelect = ev.target.value == "True";
        this.$("#div_license_type select").prop("required", isSelect);
        this.$("#div_license_type").toggle(isSelect);

        this.$("#div_DRE_license_no input").prop("required", isSelect);
        this.$("#div_DRE_license_no").toggle(isSelect);

        this.$("#div_DRE_license_exp_date input").prop("required", isSelect);
        this.$("#div_DRE_license_exp_date").toggle(isSelect);

        this.$("#div_previous_broker input").prop("required", isSelect);
        this.$("#div_previous_broker").toggle(isSelect);

        this.$("#div_license_type_other input").prop("required", isSelect);
        this.$("#div_license_type_other").toggle(isSelect);

        this.$("#div_has_NMLS_license select").prop("required", isSelect);
        this.$("#div_has_NMLS_license").toggle(isSelect);

        this.$("#div_nmls").toggle(isSelect);

        this.$("#div_driver_license_file input").prop("required", isSelect);

        const license_file_label = this.$("#div_driver_license_file label");
        if (isSelect) {
          license_file_label.removeClass("label-optional");
        } else {
          license_file_label.addClass("label-optional");
        }
      },
      _onChangeW9Type: function (ev) {
        const isSelect = ev.target.value === "business";
        this._handleDRELicense(isSelect);
      },
      _handleDRELicense: function (isSelect) {
        this.$("#div_business_name").toggle(isSelect);
        this.$("#div_business_name input").prop("required", isSelect);

        this.$("#div_business_addr").toggle(isSelect);

        this.$("#div_ein").toggle(isSelect);
        this.$("#div_ein input").prop("required", isSelect);

        this.$("#div_federal_tax_type").toggle(isSelect);
        this.$("#div_federal_tax_type select").prop("required", isSelect);

        this.$("#div_federal_tax_type_other").toggle(isSelect);
      },
      _onChangeFederalTaxType: function (ev) {
        if (this.$(ev.target).val() == "other") {
          this.$("#div_federal_tax_type_other input")
            .prop("required", true)
            .show();
        } else {
          this.$("#div_federal_tax_type_other input")
            .prop("required", false)
            .hide();
        }
      },
      _onChangeBqLoanOfficers: function (ev) {
        this.$("#div_nmls label").text(function () {
          if (ev.target.value == "True") {
            $(this).siblings("input").prop("required", true).show();
            $(this).text("NMLS#");
            $(this).removeClass("label-optional");
          } else {
            $(this).siblings("input").prop("required", false).hide();
            $(this).text("");
            $(this).addClass("label-optional");
          }
        });
      },
      _onClickStepNextButton: function (ev) {
        const isValid = this._validateStep(this.currentStep);
        if (!isValid) {
          return;
        }
        this.$(`#step-form-${this.currentStep}`).hide();
        this.$(`#steps-item-container-${this.currentStep}`).removeClass(
          "steps-item-active"
        );
        this.$(`#steps-item-container-${this.currentStep}`).addClass(
          "steps-item-finish"
        );

        this.$(`#step-form-${this.currentStep + 1}`).show();
        this.$(`#steps-item-container-${this.currentStep + 1}`).addClass(
          "steps-item-active"
        );
        this.currentStep += 1;
      },
      _onClickStepPrevButton: function (ev) {
        this.$(`#step-form-${this.currentStep}`).hide();
        this.$(`#steps-item-container-${this.currentStep}`).removeClass(
          "steps-item-active"
        );
        this.$(`#step-form-${this.currentStep - 1}`).show();
        this.$(`#steps-item-container-${this.currentStep - 1}`).removeClass(
          "steps-item-finish"
        );
        this.$(`#steps-item-container-${this.currentStep - 1}`).addClass(
          "steps-item-active"
        );
        this.currentStep -= 1;
      },
      _onClickStepsItemContainer: function (ev) {
        const divId = Number($(ev.currentTarget).data("id"));
        if (divId == this.currentStep) {
          return;
        }
        const isValid = this._validateStep(this.currentStep);
        if (!isValid && divId > this.currentStep) {
          return;
        }
        if (isValid) {
          this.$(`#steps-item-container-${this.currentStep}`).addClass(
            "steps-item-finish"
          );
        }
        this.$(`#steps-item-container-${this.currentStep}`).removeClass(
          "steps-item-active"
        );
        this.$(`#step-form-${this.currentStep}`).hide();
        this.$(`#steps-item-container-${divId}`).removeClass(
          "steps-item-finish"
        );
        this.$(`#steps-item-container-${divId}`).addClass("steps-item-active");
        this.$(`#step-form-${divId}`).show();

        this.currentStep = divId;
      },
      _onChangeOtherLicenseFile: function (ev) {
        this._validUploadFiles(ev, 3 * 1024 * 1024, 5);
      },
      _onChangeCommonFile: function (ev) {
        this._validUploadFiles(ev, 3 * 1024 * 1024);
      },
      _onChangeWorkingLanguages: function (ev) {
        const selectedValues = [];
        $('input[name="language_id"]:checked').each(function () {
          selectedValues.push($(this).val());
        });
        $("#language_ids").val(selectedValues.join(","));
      },
      _validUploadFiles: function (ev, maxSize, maxFiles = 1) {
        const files = ev.target.files;
        if (files.length > maxFiles) {
          alert(`You can only select up to ${maxFiles} files.`);
          ev.target.value = "";
          return false;
        }
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.size > maxSize) {
            alert(`File size should not exceed ${maxSize / 1024 / 1024}MB.`);
            ev.target.value = "";
            return false;
          }
        }
        return true;
      },
      /**
       * @private
       */
      _changeCountry: function () {
        if (!$("#country_id").val()) {
          return;
        }
        const self = this;
        this._rpc({
          route: "/shop/country_infos/" + $("#country_id").val(),
          params: {
            mode: "new",
          },
        }).then(function (data) {
          // placeholder phone_code
          $("input[name='phone']").attr(
            "placeholder",
            data.phone_code !== 0 ? "+" + data.phone_code : ""
          );

          // populate states and display
          const selectStates = $("select[name='state_id']");
          // dont reload state at first loading (done in qweb)
          if (
            selectStates.data("init") === 0 ||
            selectStates.find("option").length === 1
          ) {
            if (data.states.length || data.state_required) {
              selectStates.html("");
              _.each(data.states, function (x) {
                const opt = $("<option>")
                  .text(x[1])
                  .attr("value", x[0])
                  .attr("data-code", x[2]);
                selectStates.append(opt);
              });
              selectStates.parent("div").show();
            } else {
              selectStates.val("").parent("div").hide();
            }
            selectStates.data("init", 0);
          } else {
            selectStates.data("init", 0);
          }
          self._changeState();

          // manage fields order / visibility
          if (data.fields) {
            if (
              $.inArray("zipcode", data.fields) > $.inArray("city", data.fields)
            ) {
              $(".div_zip").before($(".div_city"));
            } else {
              $(".div_zip").after($(".div_city"));
            }
            const all_fields = ["street", "zipcode", "city", "country_name"]; // "state_code"];
            _.each(all_fields, function (field) {
              $(".checkout_autoformat .div_" + field.split("_")[0]).toggle(
                $.inArray(field, data.fields) >= 0
              );
            });
          }

          if ($("label[for='zipcode']").length) {
            $("label[for='zipcode']").toggleClass(
              "label-optional",
              !data.zip_required
            );
            $("label[for='zipcode']")
              .get(0)
              .toggleAttribute("required", !!data.zip_required);
          }
          if ($("label[for='zipcode']").length) {
            $("label[for='state_id']").toggleClass(
              "label-optional",
              !data.state_required
            );
            $("label[for='state_id']")
              .get(0)
              .toggleAttribute("required", !!data.state_required);
          }
        });
      },
      _changeState: function () {
        if (!$("#state_id").val()) {
          return;
        }
        this._rpc({
          route: "/shop/city_infos/" + $("#state_id").val(),
        }).then(function (data) {
          const selectCities = $("select[name='city_id']");
          if (data.length) {
            selectCities.html("");
            _.each(data, function (city) {
              selectCities.append(
                $("<option>").text(city[1]).attr("value", city[0])
              );
            });
            selectCities.parent("div").show();
          } else {
            selectCities.val("").parent("div").hide();
          }
          $("label[name='city_id']")
            .prop("required", data.length > 0)
            .toggleClass("label-optional", data.length === 0);
        });
      },
      _validateStep: function (step) {
        let isValid = true;

        this.$(`#step-form-${step}`)
          .find("input[required], select[required]")
          .each(function (index, elem) {
            if (!elem.checkValidity()) {
              isValid = false;
              $(elem).addClass("is-invalid");
              return false;
            } else {
              $(elem).removeClass("is-invalid");
            }
          });
        return isValid;
      },
      /**
       * @private
       * @param {Event} ev
       */
      _onChangeCountry: function (ev) {
        this._changeCountry();
      },
      _onChangeState: function (ev) {
        this._changeState();
      },
    }
  );

  return {
    AgentApplication: publicWidget.registry.AgentApplication,
  };
});
