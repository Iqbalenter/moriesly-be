import { getMetabolicOverview } from "../service/dashboard.service.js";

/**
 * Get dashboard metabolic overview
 * GET /api/dashboard/metabolic-overview?range=1h|24h|7d
 */
export const getMetabolicOverviewData = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const { range = "24h" } = req.query;

    if (!["1h", "24h", "7d"].includes(range)) {
      return res.status(400).json({
        success: false,
        message: "Range tidak valid. Gunakan: 1h, 24h, atau 7d.",
      });
    }

    const result = await getMetabolicOverview(userId, range);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};
