const { 
  parseISO, 
  addMinutes, 
  isBefore, 
  format, 
} = require('date-fns');

function generateSlots(dateStr, open, close) {
  const requestedDate = parseISO(dateStr);
  const slots = [];
  const [openH, openM] = open.split(':').map(Number);
  const [closeH, closeM] = close.split(':').map(Number);

  let currentSlot = new Date(requestedDate);
  currentSlot.setHours(openH, openM, 0, 0);

  const endTime = new Date(requestedDate);
  endTime.setHours(closeH, closeM, 0, 0);

  while (isBefore(currentSlot, endTime)) {
    slots.push(format(currentSlot, 'HH:mm'));
    currentSlot = addMinutes(currentSlot, 30);
  }
  return slots;
}

const weekdaySlots = generateSlots('2026-04-08', '09:00', '18:00');
console.log('Weekday slots (09:00 - 18:00):', weekdaySlots.length, weekdaySlots[0], '...', weekdaySlots[weekdaySlots.length-1]);

const satSlots = generateSlots('2026-04-11', '09:00', '13:00');
console.log('Saturday slots (09:00 - 13:00):', satSlots.length, satSlots[0], '...', satSlots[satSlots.length-1]);

function filterSlots(dateStr, slots, busyIntervals) {
  const requestedDate = parseISO(dateStr);
  return slots.filter(slotTime => {
    const [slotH, slotM] = slotTime.split(':').map(Number);
    const slotStart = new Date(requestedDate);
    slotStart.setHours(slotH, slotM, 0, 0);
    
    const slotEnd = addMinutes(slotStart, 30);

    const isBusy = busyIntervals.some(interval => {
      const busyStart = new Date(interval.start);
      const busyEnd = new Date(interval.end);

      return isBefore(slotStart, busyEnd) && isBefore(busyStart, slotEnd);
    });

    return !isBusy;
  });
}

const busy = [
  { start: '2026-04-08T10:00:00Z', end: '2026-04-08T11:00:00Z' }
];

// Note: Date objects in node might use local time or UTC. 
// In our route, we use parseISO and then setHours which uses local time.
// FreeBusy returns ISO strings which usually have 'Z' or offset.

console.log('Filtering 10:00-11:00 from weekday slots...');
// We need to be careful with timezones in this test script.
// But the logic check is:
// slot 09:30-10:00 -> slotEnd (10:00) > busyStart (10:00) is FALSE. OK.
// slot 10:00-10:30 -> slotStart (10:00) < busyEnd (11:00) is TRUE, busyStart (10:00) < slotEnd (10:30) is TRUE. BUSY.
// slot 11:00-11:30 -> slotStart (11:00) < busyEnd (11:00) is FALSE. OK.

const available = filterSlots('2026-04-08', weekdaySlots, [
    { start: new Date('2026-04-08T10:00:00').toISOString(), end: new Date('2026-04-08T11:00:00').toISOString() }
]);
console.log('Available slots around 10:00:', available.filter(s => s >= '09:30' && s <= '11:30'));
