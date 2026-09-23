// Single source of truth for computing a student's total fees owed.
// Fixes the bug where "Registration (New Pupil)" and "Registration (Old Pupil)"
// were both being summed together for every student.
//
// structures: array of fee_structures rows ({ level_group, component, amount })
// levelGroup: the matched level_group string for this student's class
// isNewPupil: boolean — true if the pupil has never enrolled at the school before
export function computeTotalOwed(structures, levelGroup, isNewPupil) {
  const comps = (structures || []).filter(s => s.level_group === levelGroup);

  const tuitionTotal = comps
    .filter(c => !c.component.toLowerCase().includes("registration"))
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  const regComponent = isNewPupil
    ? comps.find(c => c.component.toLowerCase().includes("registration") && c.component.toLowerCase().includes("new"))
    : comps.find(c => c.component.toLowerCase().includes("registration") && c.component.toLowerCase().includes("old"));

  const registrationTotal = regComponent ? (Number(regComponent.amount) || 0) : 0;

  return tuitionTotal + registrationTotal;
}
