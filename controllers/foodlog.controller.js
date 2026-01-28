import {
  createFoodLog,
  getTodayFoodLogs,
  getFoodLogsByDateRange,
  getTodaySugarTotal,
  deleteFoodLog,
  getFoodLogStatistics,
} from "../service/foodlog.service.js";

/**
 * Manual add food log
 * POST /api/foodlogs
 */
export const addFoodLog = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const logData = req.body;

    const log = await createFoodLog(userId, logData);

    res.status(201).json({
      success: true,
      data: log,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get today's food logs
 * GET /api/foodlogs/today
 */
export const getTodayLogs = async (req, res, next) => {
  try {
    const userId = req.user.uid;

    const logs = await getTodayFoodLogs(userId);
    const totalSugar = await getTodaySugarTotal(userId);

    res.json({
      success: true,
      data: {
        logs: logs,
        totalSugar: totalSugar,
        count: logs.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get food logs by date range
 * GET /api/foodlogs?startDate=2025-01-01&endDate=2025-01-31
 */
export const getLogsByDateRange = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: "startDate and endDate are required",
      });
    }

    const logs = await getFoodLogsByDateRange(userId, startDate, endDate);

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete food log
 * DELETE /api/foodlogs/:logId
 */
export const removeLog = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const { logId } = req.params;

    await deleteFoodLog(userId, logId);

    res.json({
      success: true,
      message: "Food log deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get statistics
 * GET /api/foodlogs/statistics
 */
export const getStatistics = async (req, res, next) => {
  try {
    const userId = req.user.uid;

    const stats = await getFoodLogStatistics(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
