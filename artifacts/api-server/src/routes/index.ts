import { Router, type IRouter } from "express";
import healthRouter from "./health";
import memoriesRouter from "./memories";
import filesRouter from "./files";
import chatRouter from "./chat";
import searchRouter from "./search";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(memoriesRouter);
router.use(filesRouter);
router.use(chatRouter);
router.use(searchRouter);
router.use(statsRouter);

export default router;
