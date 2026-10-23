import mongoose from 'mongoose';

const OrganizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    ownerId: { type: String, required: true, index: true },
    members: {
      type: [
        {
          userId: { type: String, required: true },
          role: { type: String, enum: ['admin', 'teacher', 'student'], default: 'student' },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

OrganizationSchema.index({ 'members.userId': 1 });

export default mongoose.model('Organization', OrganizationSchema);
