module.exports = {
  async up(db) {
    const items = await db
      .collection('appraisalitems')
      .find({
        $or: [{ type: 'Training' }, { type: 'Training_Suggested' }],
      })
      .toArray();
    items.forEach((i) => {
      db.collection('appraisalitems').updateOne(
        {
          _id: i._id,
        },
        {
          $set: {
            type: 'Training_Planned',
            typePrev: i.type,
          },
        },
      );
    });
  },

  async down(db) {
    const items = await db
      .collection('appraisalitems')
      .find({ type: 'Training_Planned' })
      .toArray();
    items.forEach((i) => {
      db.collection('appraisalitems').updateOne(
        {
          _id: i._id,
        },
        {
          $set: {
            type: i.typePrev,
          },
          $unset: {
            typePrev: '',
          },
        },
      );
    });
  },
};
