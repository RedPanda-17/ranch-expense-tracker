# Ranch Expense Tracker v1.4.4 — Receipt Zoom & PDF Optimization Update

## Receipt verification
- The receipt preview at the top of Add Expense can now be tapped/clicked.
- Added **Open larger** for an explicit full-size preview.
- Image receipts open in the existing receipt viewer with:
  - Zoom out
  - Zoom in
  - Reset
  - 75%–400% zoom range
  - Tap/click image to toggle between fit and 200%
  - Scrollable viewing while zoomed
- PDF receipts open in the larger PDF viewer and use the browser/PDF viewer's built-in zoom controls where available.
- The same large viewer works for receipts already stored on expenses.

## PDF file-size optimization
- Stored receipt quality remains higher for local viewing:
  - maximum stored image dimension: 1800 px
  - JPEG quality target: 0.80
- PDF export now uses a separate, more aggressive adaptive image pipeline:
  - starts at 1280 px / quality 0.64
  - progressively reduces quality/resolution if the encoded image remains large
  - targets roughly **120 KB per receipt image** when practical
  - minimum floor: 960 px maximum dimension / JPEG quality 0.48
- Existing v1.x image receipts benefit when a new PDF is generated.
- Image receipts are still rendered once in the report rather than duplicated as embedded originals.
- PDFs/non-image supporting files remain embedded as files when appropriate.

## Expected result
A 10-receipt report made from normal phone photos should generally be dramatically smaller than the original full-resolution approach. Exact size varies by receipt complexity, lighting, cropping, and image noise, so a fixed 1 MB result is not guaranteed.

## Suggested GitHub commit
`v1.4.4: add receipt zoom and adaptive PDF image compression`
