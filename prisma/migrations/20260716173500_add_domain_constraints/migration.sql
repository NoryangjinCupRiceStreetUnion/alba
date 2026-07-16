ALTER TABLE "User"
ADD CONSTRAINT "User_trustBattery_max" CHECK ("trustBattery" <= 100);

ALTER TABLE "Item"
ADD CONSTRAINT "Item_dailyPrice_nonnegative" CHECK ("dailyPrice" >= 0),
ADD CONSTRAINT "Item_weeklyPrice_nonnegative" CHECK ("weeklyPrice" IS NULL OR "weeklyPrice" >= 0),
ADD CONSTRAINT "Item_availability_valid" CHECK ("availableFrom" < "availableUntil");

ALTER TABLE "ItemImage"
ADD CONSTRAINT "ItemImage_order_nonnegative" CHECK ("order" >= 0);

ALTER TABLE "ItemMetricDaily"
ADD CONSTRAINT "ItemMetricDaily_counts_nonnegative" CHECK (
  "viewCount" >= 0
  AND "rentalRequestCount" >= 0
  AND "rentalApprovedCount" >= 0
);

ALTER TABLE "Rental"
ADD CONSTRAINT "Rental_totalPrice_nonnegative" CHECK ("totalPrice" >= 0),
ADD CONSTRAINT "Rental_period_valid" CHECK ("startAt" < "endAt");

ALTER TABLE "Review"
ADD CONSTRAINT "Review_rating_range" CHECK ("rating" BETWEEN 1 AND 5);
