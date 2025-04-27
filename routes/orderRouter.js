const express = require("express");
const { OrderModel } = require("../models/orderModel");
const { ProductModel } = require("../models/productModel");
const { farmerAuth } = require("../middlewares/farmerAuth");

const orderRouter = express.Router();

// Create a new order (consumer)
orderRouter.post("/", async (req, res) => {
  try {
    const { products, deliveryAddress, paymentMethod } = req.body;
    const consumerId = req.user._id;

    // Validate products and calculate total amount
    let totalAmount = 0;
    const farmerId = await ProductModel.findById(products[0].productId).select(
      "farmerId"
    );

    if (!farmerId) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if all products belong to the same farmer
    for (const item of products) {
      const product = await ProductModel.findById(item.productId);
      if (!product) {
        return res
          .status(404)
          .json({ message: `Product ${item.productId} not found` });
      }
      if (product.farmerId.toString() !== farmerId.farmerId.toString()) {
        return res
          .status(400)
          .json({ message: "All products must be from the same farmer" });
      }
      if (product.quantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient quantity for product ${product.name}`,
        });
      }
      totalAmount += product.price * item.quantity;
    }

    // Create the order
    const order = new OrderModel({
      consumerId,
      farmerId: farmerId.farmerId,
      products: await Promise.all(
        products.map(async (item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: (await ProductModel.findById(item.productId)).price,
        }))
      ),
      totalAmount,
      deliveryAddress,
      paymentMethod,
      status: "pending",
      paymentStatus: "pending",
    });

    await order.save();

    // Update product quantities
    for (const item of products) {
      await ProductModel.findByIdAndUpdate(item.productId, {
        $inc: { quantity: -item.quantity },
      });
    }

    res.status(201).json({ message: "Order created successfully", order });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating order", error: error.message });
  }
});

// Get all orders for a consumer
orderRouter.get("/consumer", async (req, res) => {
  try {
    const consumerId = req.user._id;
    const orders = await OrderModel.find({ consumerId })
      .populate("farmerId", "name email phone farmInfo.farmName")
      .populate("products.productId", "name description price unit");
    res.status(200).json(orders);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching orders", error: error.message });
  }
});

// Get all orders for a farmer
orderRouter.get("/farmer", farmerAuth, async (req, res) => {
  try {
    const farmerId = req.user._id;
    const orders = await OrderModel.find({ farmerId })
      .populate("consumerId", "name email phone")
      .populate("products.productId", "name description price unit");
    res.status(200).json(orders);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching orders", error: error.message });
  }
});

// Get single order
orderRouter.get("/:id", async (req, res) => {
  try {
    const order = await OrderModel.findById(req.params.id)
      .populate("consumerId", "name email phone")
      .populate("farmerId", "name email phone farmInfo.farmName")
      .populate("products.productId", "name description price unit");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if the user is authorized to view this order
    if (
      order.consumerId._id.toString() !== req.user._id.toString() &&
      order.farmerId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    res.status(200).json(order);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching order", error: error.message });
  }
});

// Update order status (farmer only)
orderRouter.put("/:id/status", farmerAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;
    const farmerId = req.user._id;

    const order = await OrderModel.findOne({ _id: orderId, farmerId });

    if (!order) {
      return res
        .status(404)
        .json({ message: "Order not found or unauthorized" });
    }

    const updatedOrder = await OrderModel.findByIdAndUpdate(
      orderId,
      { status, updatedAt: Date.now() },
      { new: true }
    );

    res.status(200).json({
      message: "Order status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating order status", error: error.message });
  }
});

// Update payment status (farmer only)
orderRouter.put("/:id/payment", farmerAuth, async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    const orderId = req.params.id;
    const farmerId = req.user._id;

    const order = await OrderModel.findOne({ _id: orderId, farmerId });

    if (!order) {
      return res
        .status(404)
        .json({ message: "Order not found or unauthorized" });
    }

    const updatedOrder = await OrderModel.findByIdAndUpdate(
      orderId,
      { paymentStatus, updatedAt: Date.now() },
      { new: true }
    );

    res.status(200).json({
      message: "Payment status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating payment status", error: error.message });
  }
});

// Cancel order (consumer only)
orderRouter.put("/:id/cancel", async (req, res) => {
  try {
    const orderId = req.params.id;
    const consumerId = req.user._id;

    const order = await OrderModel.findOne({ _id: orderId, consumerId });

    if (!order) {
      return res
        .status(404)
        .json({ message: "Order not found or unauthorized" });
    }

    if (order.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending orders can be cancelled" });
    }

    // Update order status
    const updatedOrder = await OrderModel.findByIdAndUpdate(
      orderId,
      { status: "cancelled", updatedAt: Date.now() },
      { new: true }
    );

    // Restore product quantities
    for (const item of order.products) {
      await ProductModel.findByIdAndUpdate(item.productId, {
        $inc: { quantity: item.quantity },
      });
    }

    res
      .status(200)
      .json({ message: "Order cancelled successfully", order: updatedOrder });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error cancelling order", error: error.message });
  }
});

module.exports = { orderRouter };
