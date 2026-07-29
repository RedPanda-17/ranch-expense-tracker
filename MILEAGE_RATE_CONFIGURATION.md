# Mileage Rate Configuration

The user cannot edit the mileage rate. Version 1.3.4 is currently set to **$0.40 per mile**.

After Accounting confirms a different rate:

1. Open `app.js`.
2. Change the value near the top:

```javascript
const FIXED_MILEAGE_RATE = 0.40;
```

3. Change `fixedMileageRate` in `version.json` to the same value.
4. Increase the application version and release date.
5. Change the cache name in `service-worker.js` so installed copies receive the update.
6. Update the standalone HTML's embedded `APP_VERSION` and mileage value.
7. Run the QA checklist, including mileage calculation, PDF/CSV export, and installed-app update testing.

A rate change should be released as a new version so reports retain a clear record of which application release produced them.
