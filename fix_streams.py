path = "/home/atumkeze/school-manager/frontend/src/pages/Students.jsx"
c = open(path).read()

# Fix the import function to pass is_repeating to createHolidayFeeIfNeeded
old = """          await createHolidayFeeIfNeeded(newStudent.id, matchedClass.id);"""
new = """          await createHolidayFeeIfNeeded(newStudent.id, matchedClass.id, !isRepeating);"""

print("found:", old in c)
if old in c:
    c = c.replace(old, new, 1)
    print("Import call fixed!")

# Also make sure is_repeating is read from CSV row in import
old2 = """        const fullName = obj["full_name"] || obj["name"] || "";"""
new2 = """        const fullName = obj["full_name"] || obj["name"] || "";
        const isRepeating = obj["is_repeating"] === "true" || obj["is_repeating"] === "1";
        const isNewPupil = !isRepeating;"""

print("fullName line found:", old2 in c)
if old2 not in c and 'const fullName' in c:
    c = c.replace(
        '        const fullName = obj["full_name"] || obj["name"] || "";',
        new2, 1
    )
    print("isRepeating from CSV added!")

# Also add is_new_pupil to the student insert in import
old3 = """            academic_year_id:  activeYear.id,
            photo_url:         null,
            parent_name:       obj["father_name"] || obj["mother_name"] || null,
            parent_phone:      obj["father_phone"] || obj["mother_phone"] || null,"""
new3 = """            academic_year_id:  activeYear.id,
            is_repeating:      isRepeating,
            photo_url:         null,
            parent_name:       obj["father_name"] || obj["mother_name"] || null,
            parent_phone:      obj["father_phone"] || obj["mother_phone"] || null,"""

print("insert found:", old3 in c)
if old3 in c:
    c = c.replace(old3, new3, 1)
    print("is_repeating added to import insert!")

open(path, "w").write(c)
print("Students.jsx saved!")
