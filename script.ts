import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: [{
    emit: 'event',
    level: 'query',
  },]
})

prisma.$on('query', (e) => {
  console.log('Query: ' + e.query)
  console.log('Params: ' + e.params)
})

async function main() {

  // cleanup first
  const deletedPackingListToEquipment = await prisma.packingListToEquipment.deleteMany({})
  const deletedPackagingList = await prisma.packingList.deleteMany({})
  const deletedEquipment = await prisma.equipment.deleteMany({})
  const deletedUser = await prisma.user.deleteMany({})

  // define things
  const packingListId = "123456789"
  const auth0Id = "123456789"
  const equipmentOwnedByUser = [
    { id: "1", name: "Foo" },
    { id: "2", name: "Bar" },
    { id: "3", name: "Baz" }
  ]

  // create packingList and user along the way
  const packingList = await prisma.packingList.create({
    data: {
      id: packingListId,
      createdBy: {
        create: {
          auth0Id: auth0Id,
        }
      },
      name: "foo",
    },
  });
  console.log({ packingList })

  const userId = packingList.userId

  // create equipment for this user
  const createdEquipment = await prisma.equipment.createMany({
    data: equipmentOwnedByUser.map(({ id, name }) => ({
      id: id,
      name: name,
      ownerId: userId
    }))
  });
  console.log({ createdEquipment })

  // code from https://github.com/prisma/prisma/issues/5851
  const updateResult = await prisma.packingList.update({
    where: {
      id: packingListId,
      // `createdBy` is not part of `PackingListWhereUniqueInput`
      createdBy: {
        auth0Id,
      },
    },
    data: {
      // I want to edit relations that's why `updateMany` is not an option
      equipment: {
        createMany: {
          data: equipmentOwnedByUser.map(({ id }) => ({
            equipmentId: id,
          })),
        },
      },
    },
  });
  console.log({ updateResult })

}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })