# Mileage Rate Configuration

The mileage rate is currently fixed at:

`$0.40 per mile`

The value is defined near the top of `app.js`:

```javascript
const FIXED_MILEAGE_RATE = 0.40;
```

Employees cannot change the rate in Settings.

Before employee mileage use, Accounting should confirm the approved rate. After changing it:

1. Update `FIXED_MILEAGE_RATE` in `app.js` and the standalone HTML.
2. Update `version.json` and this document.
3. Change the service-worker cache name.
4. Test mileage calculations, PDF, CSV, and backups.
5. Release a new version number.
