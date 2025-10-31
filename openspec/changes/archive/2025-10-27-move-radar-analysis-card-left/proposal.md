## Why
Currently, the "Radar Data Analysis & Lane Scenarios" card is positioned below the tracking map in the Live Tracking tab, creating a vertical layout that takes up significant screen space. Moving this card to the left of the tracking map will create a more efficient side-by-side layout that allows users to view both the radar analysis data and the tracking map simultaneously without scrolling.

## What Changes
- Move the "Radar Data Analysis & Lane Scenarios" card from below the tracking map to the left side
- Create a horizontal layout with the radar analysis card on the left and tracking map on the right
- Maintain all existing functionality and data display within the radar analysis card
- Ensure responsive design works properly on different screen sizes
- Preserve the existing controls and canvas functionality
- Add validation to ensure radar analysis card displays real data from 0x01 packet ObjectData via Redis key `deviceId/ObjectData`

## Impact
- Affected specs: dashboard (modify Live Tracking tab layout requirements)
- Affected code: 
  - `dashboard/src/components/LiveTracking.tsx` (layout restructuring and ObjectData validation)
  - CSS/styling adjustments for responsive side-by-side layout
  - Integration with Redis ObjectData validation via `deviceId/ObjectData` key pattern
  - No changes to data processing or WebSocket functionality
