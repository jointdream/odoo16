/** @odoo-module */

import { ControlButtonsMixin } from "@point_of_sale/js/ControlButtonsMixin";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { useBarcodeReader } from "@point_of_sale/js/custom_hooks";
import { parse } from "web.field_utils";

import { NumberPopup } from "@point_of_sale/js/Popups/NumberPopup";
import { ErrorPopup } from "@point_of_sale/js/Popups/ErrorPopup";
import { ErrorBarcodePopup } from "@point_of_sale/js/Popups/ErrorBarcodePopup";
import { ConfirmPopup } from "@point_of_sale/js/Popups/ConfirmPopup";
import { ControlButtonPopup } from "@point_of_sale/js/Popups/ControlButtonPopup";

import { ActionpadWidget } from "./ActionpadWidget";
import { MobileOrderWidget } from "../../Misc/MobileOrderWidget";
import { NumpadWidget } from "./NumpadWidget";
import { OrderWidget } from "./OrderWidget";
import { ProductsWidget } from "./ProductsWidget";
import { usePos } from "@point_of_sale/app/pos_hook";
import { Component, onMounted, useState } from "@odoo/owl";

export class ProductScreen extends ControlButtonsMixin(Component) {
    static template = "ProductScreen";
    static components = {
        ActionpadWidget,
        MobileOrderWidget,
        NumpadWidget,
        OrderWidget,
        ProductsWidget,
    };

    setup() {
        super.setup();
        this.pos = usePos();
        this.popup = useService("popup");
        this.orm = useService("orm");
        this.numberBuffer = useService("number_buffer");
        onMounted(this.onMounted);
        // Call `reset` when the `onMounted` callback in `numberBuffer.use` is done.
        // We don't do this in the `mounted` lifecycle method because it is called before
        // the callbacks in `onMounted` hook.
        onMounted(() => this.numberBuffer.reset());
        useBarcodeReader({
            product: this._barcodeProductAction,
            weight: this._barcodeProductAction,
            price: this._barcodeProductAction,
            client: this._barcodePartnerAction,
            discount: this._barcodeDiscountAction,
            error: this._barcodeErrorAction,
        });
        this.state = useState({
            mobile_pane: this.props.mobile_pane || "right",
        });
    }
    onMounted() {
        this.pos.openCashControl();
    }
    /**
     * To be overridden by modules that checks availability of
     * connected scale.
     * @see _onScaleNotAvailable
     */
    get partner() {
        return this.currentOrder ? this.currentOrder.get_partner() : null;
    }
    get currentOrder() {
        return this.env.pos.get_order();
    }
    async updateSelectedOrderline({ buffer, key }) {
        if (this.env.pos.numpadMode === "quantity" && this.env.pos.disallowLineQuantityChange()) {
            const order = this.env.pos.get_order();
            if (!order.orderlines.length) {
                return;
            }
            const selectedLine = order.get_selected_orderline();
            const orderlines = order.orderlines;
            const lastId = orderlines.length !== 0 && orderlines.at(orderlines.length - 1).cid;
            const currentQuantity = this.env.pos
                .get_order()
                .get_selected_orderline()
                .get_quantity();

            if (selectedLine.noDecrease) {
                this.popup.add(ErrorPopup, {
                    title: this.env._t("Invalid action"),
                    body: this.env._t("You are not allowed to change this quantity"),
                });
                return;
            }
            const parsedInput = (buffer && parse.float(buffer)) || 0;
            if (lastId != selectedLine.cid) {
                this._showDecreaseQuantityPopup();
            } else if (currentQuantity < parsedInput) {
                this._setValue(buffer);
            } else if (parsedInput < currentQuantity) {
                this._showDecreaseQuantityPopup();
            }
        } else {
            const val = buffer === null ? "remove" : buffer;
            this._setValue(val);
            if (val == "remove") {
                this.numberBuffer.reset();
                this.env.pos.numpadMode = "quantity";
            }
        }
    }
    _setValue(val) {
        if (this.currentOrder.get_selected_orderline()) {
            if (this.env.pos.numpadMode === "quantity") {
                const result = this.currentOrder.get_selected_orderline().set_quantity(val);
                if (!result) {
                    this.numberBuffer.reset();
                }
            } else if (this.env.pos.numpadMode === "discount") {
                this.currentOrder.get_selected_orderline().set_discount(val);
            } else if (this.env.pos.numpadMode === "price") {
                var selected_orderline = this.currentOrder.get_selected_orderline();
                selected_orderline.price_manually_set = true;
                selected_orderline.set_unit_price(val);
            }
        }
    }
    async _barcodeProductAction(code) {
        let product = this.env.pos.db.get_product_by_barcode(code.base_code);
        if (!product) {
            // find the barcode in the backend
            let foundProductIds = [];
            foundProductIds = await this.orm.search("product.product", [
                ["barcode", "=", code.base_code],
            ]);
            if (foundProductIds.length) {
                await this.env.pos._addProducts(foundProductIds);
                // assume that the result is unique.
                product = this.env.pos.db.get_product_by_id(foundProductIds[0]);
            } else {
                return this._barcodeErrorAction(code);
            }
        }
        const options = await product.getAddProductOptions(code);
        // Do not proceed on adding the product when no options is returned.
        // This is consistent with clickProduct.
        if (!options) {
            return;
        }

        // update the options depending on the type of the scanned code
        if (code.type === "price") {
            Object.assign(options, {
                price: code.value,
                extras: {
                    price_manually_set: true,
                },
            });
        } else if (code.type === "weight") {
            Object.assign(options, {
                quantity: code.value,
                merge: false,
            });
        } else if (code.type === "discount") {
            Object.assign(options, {
                discount: code.value,
                merge: false,
            });
        }
        this.currentOrder.add_product(product, options);
        this.numberBuffer.reset();
    }
    _barcodePartnerAction(code) {
        const partner = this.env.pos.db.get_partner_by_barcode(code.code);
        if (partner) {
            if (this.currentOrder.get_partner() !== partner) {
                this.currentOrder.set_partner(partner);
                this.currentOrder.updatePricelist(partner);
            }
            return true;
        }
        this._barcodeErrorAction(code);
        return false;
    }
    _barcodeDiscountAction(code) {
        var last_orderline = this.currentOrder.get_last_orderline();
        if (last_orderline) {
            last_orderline.set_discount(code.value);
        }
    }
    // IMPROVEMENT: The following two methods should be in PosScreenComponent?
    // Why? Because once we start declaring barcode actions in different
    // screens, these methods will also be declared over and over.
    _barcodeErrorAction(code) {
        this.popup.add(ErrorBarcodePopup, { code: this._codeRepr(code) });
    }
    _codeRepr(code) {
        if (code.code.length > 32) {
            return code.code.substring(0, 29) + "...";
        } else {
            return code.code;
        }
    }
    async _displayAllControlPopup() {
        await this.popup.add(ControlButtonPopup, {
            controlButtons: this.controlButtons,
        });
    }
    async _showDecreaseQuantityPopup() {
        this.numberBuffer.reset();
        const { confirmed, payload: inputNumber } = await this.popup.add(NumberPopup, {
            startingValue: 0,
            title: this.env._t("Set the new quantity"),
        });
        const newQuantity = inputNumber && inputNumber !== "" ? parse.float(inputNumber) : null;
        if (confirmed && newQuantity !== null) {
            const order = this.env.pos.get_order();
            const selectedLine = this.env.pos.get_order().get_selected_orderline();
            const currentQuantity = selectedLine.get_quantity();
            if (
                selectedLine.is_last_line() &&
                currentQuantity === 1 &&
                newQuantity < currentQuantity
            ) {
                selectedLine.set_quantity(newQuantity);
            } else if (newQuantity >= currentQuantity) {
                selectedLine.set_quantity(newQuantity);
            } else {
                const newLine = selectedLine.clone();
                const decreasedQuantity = currentQuantity - newQuantity;
                newLine.order = order;

                newLine.set_quantity(-decreasedQuantity, true);
                order.add_orderline(newLine);
            }
        }
    }
    async onClickPay() {
        if (
            this.env.pos
                .get_order()
                .orderlines.some(
                    (line) =>
                        line.get_product().tracking !== "none" && !line.has_valid_product_lot()
                ) &&
            (this.env.pos.picking_type.use_create_lots ||
                this.env.pos.picking_type.use_existing_lots)
        ) {
            const { confirmed } = await this.popup.add(ConfirmPopup, {
                title: this.env._t("Some Serial/Lot Numbers are missing"),
                body: this.env._t(
                    "You are trying to sell products with serial/lot numbers, but some of them are not set.\nWould you like to proceed anyway?"
                ),
                confirmText: this.env._t("Yes"),
                cancelText: this.env._t("No"),
            });
            if (confirmed) {
                this.pos.showScreen("PaymentScreen");
            }
        } else {
            this.pos.showScreen("PaymentScreen");
        }
    }
    switchPane() {
        this.state.mobile_pane = this.state.mobile_pane === "left" ? "right" : "left";
    }
}

registry.category("pos_screens").add("ProductScreen", ProductScreen);
