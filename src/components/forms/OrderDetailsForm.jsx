import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const OrderDetailsForm = ({ order, onSubmit, onCancel }) => {
  const { products } = useAppContext();
  const { transports } = useAppContext(); // Get transports from context
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    customerName: "",
    city: "",
    phoneNumber: "",
    deliveryLocation: "",
    deliveryTime: "",
    items: [{ productId: "", quantity: 1, price: 0 }],
  });
  const [selectedTransport, setSelectedTransport] = useState(
    order?.transportName || ""
  );

  // Initialize form data when order prop changes
  useEffect(() => {
    if (order) {
      setFormData({
        customerName: order.customer_name || "",
        city: order.city || "",
        phoneNumber: order.phone_number || "",
        deliveryLocation: order.delivery_location || "",
        deliveryTime: order.delivery_time || "", // This will fetch from database
        items:
          order.items && order.items.length > 0
            ? JSON.parse(JSON.stringify(order.items)).map((item) => ({
                ...item,
                price: item.price || 0,
              }))
            : [{ productId: "", quantity: 1, price: 0 }],
      });
      setSelectedTransport(order.transportName || "");
    }
  }, [order]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];

    if (field === "quantity") {
      // Allow empty value to be entered (so user can delete and start typing new value)
      if (value === "") {
        newItems[index][field] = "";
      } else {
        // Convert to number when there's a value, default to 1 only if the input is invalid
        const numValue = parseInt(value, 10);
        newItems[index][field] = isNaN(numValue) ? 1 : numValue;
      }
    } else if (field === "price") {
      // Allow empty value to be entered
      if (value === "") {
        newItems[index][field] = "";
      } else {
        // Convert to number when there's a value, default to 0 if invalid
        const numValue = parseFloat(value);
        newItems[index][field] = isNaN(numValue) ? 0 : numValue;
      }
    } else if (field === "productId") {
      const product = products.find((p) => p.id === value);
      newItems[index] = {
        ...newItems[index],
        productId: value,
        unit: product ? product.unit : "",
        productName: product ? product.name : "",
      };
    } else {
      newItems[index][field] = value;
    }

    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { productId: "", quantity: 1, price: 0 }],
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, items: newItems }));
    }
  };

  const validateForm = () => {
    if (!formData.customerName.trim()) {
      toast({
        title: "Error",
        description: "Customer name is required.",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.city.trim()) {
      toast({
        title: "Error",
        description: "City is required.",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.phoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Phone number is required.",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.deliveryLocation.trim()) {
      toast({
        title: "Error",
        description: "Delivery location is required.",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.deliveryTime.trim()) {
      toast({
        title: "Error",
        description: "Delivery time is required (e.g., Morning, 2-3 PM, etc.).",
        variant: "destructive",
      });
      return false;
    }

    if (
      formData.items.some(
        (item) =>
          !item.productId ||
          item.quantity === "" ||
          item.quantity <= 0 ||
          item.price === "" ||
          item.price < 0
      )
    ) {
      toast({
        title: "Error",
        description:
          "Please ensure all order items have valid products, quantities, and prices.",
        variant: "destructive",
      });
      return false;
    }

    // Check stock availability for new items or increased quantities
    for (const item of formData.items) {
      const product = products.find((p) => p.id === item.productId);
      if (product) {
        // Get original item quantity for comparison
        const originalItem = order?.items?.find(
          (origItem) => origItem.productId === item.productId
        );
        const originalQuantity = originalItem ? originalItem.quantity : 0;
        const dispatchedQuantity = originalItem
          ? originalItem.dispatchedQuantity || 0
          : 0;

        // Calculate the difference in quantity needed
        const quantityDifference = item.quantity - originalQuantity;

        // Only check stock if we're increasing the quantity
        if (quantityDifference > 0 && product.stock < quantityDifference) {
          toast({
            title: "Error",
            description: `Insufficient stock for ${product.name}. Available: ${product.stock}, Additional needed: ${quantityDifference}`,
            variant: "destructive",
          });
          return false;
        }

        // Ensure we don't reduce quantity below already dispatched amount
        if (item.quantity < dispatchedQuantity) {
          toast({
            title: "Error",
            description: `Cannot reduce quantity for ${product.name} below dispatched amount (${dispatchedQuantity})`,
            variant: "destructive",
          });
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    // Prepare the data in the same format as expected by updateOrderDetails
    const updatedDetails = {
      customerName: formData.customerName,
      city: formData.city,
      phoneNumber: formData.phoneNumber,
      deliveryLocation: formData.deliveryLocation,
      deliveryTime: formData.deliveryTime,
      items: formData.items.map((item) => ({
        productId: item.productId,
        productName: products.find((p) => p.id === item.productId)?.name,
        quantity: item.quantity,
        price: item.price,
        unit: products.find((p) => p.id === item.productId)?.unit,
        dispatchedQuantity: item.dispatchedQuantity || 0,
        totalPrice: item.quantity * item.price,
      })),
      transportName: selectedTransport,
    };
    onSubmit(updatedDetails);
  };

  // Calculate total price
  const totalPrice = formData.items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    return sum + qty * price;
  }, 0);

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-h-[70vh] overflow-y-auto pr-2"
    >
      {/* Customer Information Section */}
      <div className="space-y-4 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold">Customer Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="customerName">Customer Name *</Label>
            <Input
              id="customerName"
              name="customerName"
              value={formData.customerName}
              onChange={handleChange}
              required
              placeholder="Enter customer name"
            />
          </div>
          <div>
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
              placeholder="Enter city"
            />
          </div>
          <div>
            <Label htmlFor="phoneNumber">Phone Number *</Label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={handleChange}
              required
              placeholder="Enter phone number"
            />
          </div>
          <div>
            <Label htmlFor="deliveryTime">Delivery Time *</Label>
            <Input
              id="deliveryTime"
              name="deliveryTime"
              type="text"
              value={formData.deliveryTime}
              onChange={handleChange}
              required
              placeholder="Enter delivery time (e.g., 2-3 PM, Morning, Evening)"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="deliveryLocation">Delivery Location *</Label>
            <Textarea
              id="deliveryLocation"
              name="deliveryLocation"
              value={formData.deliveryLocation}
              onChange={handleChange}
              required
              placeholder="Enter delivery location"
            />
          </div>
        </div>
      </div>

      {/* Transport Selection Section */}
      <div className="space-y-4 p-4 border rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Transport Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label
              htmlFor="transport-select"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Select Transport Service
            </Label>
            <select
              id="transport-select"
              className="w-full border border-gray-300 dark:border-gray-600 
                   rounded px-3 py-2 
                   bg-white dark:bg-gray-700 
                   text-gray-900 dark:text-gray-100
                   focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                   focus:border-blue-500 dark:focus:border-blue-400 
                   transition-colors duration-200
                   hover:border-gray-400 dark:hover:border-gray-500"
              value={selectedTransport}
              onChange={(e) => setSelectedTransport(e.target.value)}
            >
              <option value="" className="text-gray-500 dark:text-gray-400">
                Choose a transport service...
              </option>              {transports &&
                transports.length > 0 &&
                [...transports]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((t) => (
                    <option
                      key={t.id}
                      value={t.name}
                      className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                    >
                      {t.name}
                    </option>
                  ))}
            </select>
          </div>
        </div>
      </div>

      {/* Order Items Section */}
      <div className="space-y-6 p-6 border rounded-xl shadow-sm bg-gradient-to-br from-background to-muted/10">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <div className="w-2 h-6 bg-primary rounded-full"></div>
            Order Items
          </h3>
          <div className="text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
            {formData.items.length}{" "}
            {formData.items.length === 1 ? "item" : "items"}
          </div>
        </div>

        <div className="space-y-4">
          {formData.items.map((item, index) => {
            const originalItem = order?.items?.find(
              (origItem) => origItem.productId === item.productId
            );
            const dispatchedQuantity = originalItem
              ? originalItem.dispatchedQuantity || 0
              : 0;
            const isDispatched = dispatchedQuantity > 0;

            return (
              <div
                key={index}
                className={`group relative p-5 border-2 rounded-xl bg-card transition-all duration-200 ${isDispatched
                    ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
                    : "border-dashed border-muted-foreground/20 hover:border-muted-foreground/40 hover:shadow-md"
                  }`}
              >
                <div className="absolute -top-3 left-4 bg-background px-2 py-1 text-xs font-medium rounded-md border flex items-center gap-2">
                  <span className="text-muted-foreground">
                    Item #{index + 1}
                  </span>
                  {isDispatched && (
                    <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs font-medium dark:bg-amber-900 dark:text-amber-200">
                      Dispatched
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-8">
                    <Label
                      htmlFor={`product-${index}`}
                      className="text-sm font-medium mb-2 block"
                    >
                      Product <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={item.productId}
                      onValueChange={(value) =>
                        handleItemChange(index, "productId", value)
                      }
                    >
                      <SelectTrigger
                        id={`product-${index}`}
                        className="h-11 border-2 focus:border-primary hover:border-muted-foreground/50 transition-colors"
                      >
                        <SelectValue placeholder="Choose a product..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem
                            key={product.id}
                            value={product.id}
                            disabled={
                              product.stock <= 0 &&
                              product.id !== item.productId
                            }
                            className="py-3"
                          >
                            <div className="flex justify-between items-center w-full">
                              <span
                                className={`font-medium ${product.stock <= 0 &&
                                    product.id !== item.productId
                                    ? "text-muted-foreground"
                                    : ""
                                  }`}
                              >
                                {product.name}
                              </span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground ml-4">
                                <span className="bg-muted px-2 py-1 rounded">
                                  {product.unit}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded ${product.stock > 0
                                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                                      : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
                                    }`}
                                >
                                  Stock: {product.stock}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-3">
                    <Label
                      htmlFor={`quantity-${index}`}
                      className="text-sm font-medium mb-2 block"
                    >
                      Quantity <span className="text-destructive">*</span>
                      {dispatchedQuantity > 0 && (
                        <span className="text-amber-600 font-medium ml-1">
                          (Min: {dispatchedQuantity})
                        </span>
                      )}
                    </Label>
                    <Input
                      id={`quantity-${index}`}
                      type="number"
                      min={dispatchedQuantity || 1}
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, "quantity", e.target.value)
                      }
                      required
                      placeholder="Enter qty"
                      className="h-11 border-2 focus:border-primary hover:border-muted-foreground/50 transition-colors text-center font-medium"
                    />
                    {dispatchedQuantity > 0 && (
                      <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200 dark:border-amber-800">
                        <p className="text-xs text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                          Dispatched: {dispatchedQuantity}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-3">
                    <Label
                      htmlFor={`price-${index}`}
                      className="text-sm font-medium mb-2 block"
                    >
                      Price <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`price-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(e) =>
                        handleItemChange(index, "price", e.target.value)
                      }
                      required
                      placeholder="0.00"
                      className="h-11 border-2 focus:border-primary hover:border-muted-foreground/50 transition-colors text-center font-medium"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <Label className="text-sm font-medium mb-2 block">
                      Total
                    </Label>
                    <div className="h-11 border-2 border-muted bg-muted/50 rounded-md flex items-center justify-center font-medium text-lg">
                      {(
                        (parseFloat(item.quantity) || 0) *
                        (parseFloat(item.price) || 0)
                      ).toFixed(2)}
                    </div>
                  </div>

                  {formData.items.length > 1 && (
                    <div className="md:col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => removeItem(index)}
                        disabled={dispatchedQuantity > 0}
                        className={`h-11 w-11 rounded-lg transition-all transform ${dispatchedQuantity > 0
                            ? "opacity-40 cursor-not-allowed"
                            : "opacity-70 group-hover:opacity-100 hover:scale-105"
                          }`}
                        title={
                          dispatchedQuantity > 0
                            ? "Cannot remove dispatched items"
                            : "Remove item"
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={addItem}
            className="h-12 px-6 border-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 transition-all duration-200 group"
          >
            <Plus className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
            <span className="font-medium">Add Another Item</span>
          </Button>
        </div>

        <div className="flex justify-end pt-4">
          <div className="text-lg font-bold text-right">
            Total Price:{" "}
            <span className="text-primary">
              ₹{" "}
              {totalPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2 pt-4 sticky bottom-0 bg-background py-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="min-w-[120px]">
          Update Order
        </Button>
      </div>
    </form>
  );
};

export default OrderDetailsForm;