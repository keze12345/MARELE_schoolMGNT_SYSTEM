path = "/home/atumkeze/school-manager/frontend/src/pages/Fees.jsx"
c = open(path).read()

c = c.replace("feeStructures.length > 0", "structures.length > 0")
c = c.replace("feeStructures.map(fc =>", "structures.map(fc =>")

print("fixed:", "feeStructures" not in c)
open(path, "w").write(c)
