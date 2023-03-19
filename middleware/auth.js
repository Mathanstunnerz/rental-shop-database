import jwt from "jsonwebtoken";

export const auth = (request,response,next) => {
  const token = request.header("X-Author");

  try {
    jwt.verify(token, process.env.SECRET_KEY);
    next()
  } catch(err) {
    response.status(401).send({message:err.message});
  }
};
